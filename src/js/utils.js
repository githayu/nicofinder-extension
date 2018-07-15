// @flow

import { isPlainObject } from 'lodash'

type FetchClientRequest = {
  url: string,
  qs?: {
    [string]: string | number,
  },
  request?: any,
  responseType: 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text',
}

type XHRClientRequest = {
  url: string,
  qs?: {
    [string]: string | number,
  },
  body?: any,
  headers?: { [string]: string },
  timeout?: number,
  async?: boolean,
  withCredentials?: boolean,
  responseType?: '' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text',
}

export class DetailURL {
  url: URL

  constructor(url: string) {
    try {
      this.url = new URL(url)
    } catch (e) {
      return false
    }
  }

  getContentDir() {
    const dir = this.url.pathname
      .split('/')
      .filter((i) => i.length > 0)
      .shift()

    switch (dir) {
      case 'watch':
      case 'mylist':
      case 'search':
        return dir

      default:
        return false
    }
  }

  getContentId() {
    const rootDir = this.getContentDir()

    switch (rootDir) {
      case 'mylist':
      case 'watch':
      case 'search':
        return this.url.pathname.split('/').pop()

      default:
        return false
    }
  }

  hasDir(...req: string[]) {
    return req.includes(this.getContentDir())
  }

  get isNicofinder() {
    return this.url.hostname === 'www.nicofinder.net'
  }

  get isNiconico() {
    return this.url.hostname === 'www.nicovideo.jp'
  }
}

export class Utils {
  static getActiveTabs() {
    return new Promise((resolve) =>
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        resolve
      )
    )
  }

  static isDecimalNumber(string: string) {
    return /^(?!0)\d+$/.test(string)
  }

  static decodeURLParams(paramsString: string): Object {
    const searchParams = new URLSearchParams(paramsString)

    const resultParams = Array.from(searchParams).reduce(
      (result, [key, value]) => {
        result[key] = this.isDecimalNumber(value) ? Number(value) : value
        return result
      },
      {}
    )

    return resultParams
  }

  static async fetch({
    viaBackground,
    request,
  }: {
    viaBackground: boolean,
    request: FetchClientRequest,
  }) {
    if (viaBackground) {
      const res = await new Promise((resolve) =>
        chrome.runtime.sendMessage(
          {
            type: 'backgroundFetch',
            payload: request,
          },
          resolve
        )
      )

      if (res?.error) {
        return Promise.reject(new Error(res.message))
      }

      return res
    } else {
      return fetchClient(request).catch((err) => Promise.reject(err))
    }
  }

  static async XHR({
    viaBackground,
    request,
  }: {
    viaBackground: boolean,
    request: XHRClientRequest,
  }) {
    if (viaBackground) {
      const res = await new Promise((resolve) =>
        chrome.runtime.sendMessage(
          {
            type: 'backgroundXHR',
            payload: request,
          },
          resolve
        )
      )

      if (res?.error) {
        Promise.reject(new Error(res.message))
      }

      return res
    } else {
      return XHRClient(request).catch((err) => Promise.reject(err))
    }
  }

  static xmlChildrenParser(collections: any): any {
    var currentData = {}

    for (let children of collections) {
      let attributes = {}

      // 属性
      if (children.attributes.length) {
        for (let attribute of children.attributes) {
          let value = this.isDecimalNumber(attribute.value)
            ? Number(attribute.value)
            : attribute.value
          attributes[attribute.name] = value
        }
      }

      // 子要素
      if (children.children.length) {
        let deepData = Object.assign(
          {},
          this.xmlChildrenParser(children.children),
          attributes
        )

        // 複数の同名タグが存在
        if (
          Array.from(collections).filter(
            (element) => element.tagName === children.tagName
          ).length > 1
        ) {
          if (children.tagName in currentData === false)
            currentData[children.tagName] = []
          currentData[children.tagName].push(deepData)
        } else {
          currentData[children.tagName] = Object.assign(
            {},
            currentData[children.tagName],
            deepData
          )
        }
      } else {
        let value = this.isDecimalNumber(children.innerHTML)
          ? Number(children.innerHTML)
          : children.innerHTML
        currentData[children.tagName] = value
      }
    }

    return currentData
  }
}

/**
 * Fetch
 */
export async function fetchClient(options: FetchClientRequest) {
  const url = new URL(options.url)
  const { request, responseType } = options

  if (options.qs) {
    Object.entries(options.qs).forEach(([name, value]) =>
      url.searchParams.append(name, String(value))
    )
  }

  if (request && isPlainObject(request?.body)) {
    const formData = new FormData()

    Object.entries(request?.body).forEach(([name, value]) =>
      formData.append(name, String(value))
    )

    request.body = formData
  }

  const response = await fetch(new Request(url, options.request))

  if (!response.ok) {
    return Promise.reject(new Error(response.statusText))
  }

  // flow-disable-line
  return response[responseType]()
}

/**
 * XHR
 */
export function XHRClient(request: XHRClientRequest) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const url = new URL(request.url)
    let formData = new FormData()

    request = {
      method: 'GET',
      async: true,
      withCredentials: false,
      responseType: '',
      ...request,
    }

    if (request.hasOwnProperty('qs')) {
      Object.entries(request.qs).forEach(([name, value]) =>
        url.searchParams.append(name, String(value))
      )
    }

    if (request.hasOwnProperty('body')) {
      if (isPlainObject(request.body)) {
        Object.entries(request.body).forEach(([name, value]) =>
          formData.append(name, String(value))
        )
      } else {
        formData = request.body
      }
    }

    xhr.open(request.method, url.href, request.async)

    if (request.hasOwnProperty('headers')) {
      Object.entries(request.headers).forEach(([name, value]) =>
        xhr.setRequestHeader(name, String(value))
      )
    }

    if (request.timeout) {
      xhr.timeout = request.timeout
    }

    xhr.withCredentials = request.withCredentials || false
    xhr.responseType = request.responseType || ''

    xhr.onload = () => {
      if (/^2\d{2}$/.test(`${xhr.status}`)) {
        resolve(xhr.response)
      } else {
        reject(new Error('XHR HTTP'))
      }

      xhr.abort()
    }

    xhr.onerror = (err) => reject(new Error(err))

    xhr.ontimeout = () => reject(new Error('XHR Timeout'))

    xhr.send(formData)
  })
}
