import { isPlainObject, has, get } from 'lodash-es'

export interface FetchCoreRequest {
  url: string
  request?: RequestInit
  responseType: 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text'
  qs?: {
    [x: string]: string | number | undefined
  }
  formData?: {
    [x: string]: string | number | undefined
  }
}

export interface XHRCoreRequest {
  url: string
  qs?: {
    [x: string]: string | number
  }
  body?: any
  headers?: { [x: string]: string }
  timeout?: XMLHttpRequest['timeout']
  async?: boolean
  withCredentials?: XMLHttpRequest['withCredentials']
  responseType?: XMLHttpRequest['responseType']
  method?: Request['method']
}

export class DetailURL implements DetailURL {
  url?: URL

  constructor(url: string) {
    try {
      this.url = new URL(url)
    } catch (e) {
      console.error(e)
    }
  }

  getContentDir() {
    if (!this.url) {
      return undefined
    }

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
        return undefined
    }
  }

  getContentId() {
    const rootDir = this.getContentDir()

    if (!this.url) {
      return undefined
    }

    switch (rootDir) {
      case 'mylist':
      case 'watch':
      case 'search':
        return this.url.pathname.split('/').pop()

      default:
        return undefined
    }
  }

  hasDir(...req: string[]) {
    const dir = this.getContentDir()

    return dir && req.includes(dir)
  }

  get isNicofinder() {
    return this.url && this.url.hostname.endsWith('nicofinder.net')
  }

  get isNiconico() {
    return this.url && this.url.hostname.endsWith('nicovideo.jp')
  }

  get isNicovideo() {
    return this.url && this.url.hostname === 'www.nicovideo.jp'
  }
}

export const getActiveTabs = (): Promise<chrome.tabs.Tab[]> =>
  new Promise((resolve) =>
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      resolve
    )
  )

export const isDecimalNumber = (string: string) => /^(?!0)\d+$/.test(string)

export const decodeURLParams = (paramsString: string) => {
  const searchParams = new URLSearchParams(paramsString)
  const result: {
    [key: string]: string | number
  } = {}

  searchParams.forEach((value, key) => {
    result[key] = isDecimalNumber(value) ? Number(value) : value
  })

  return result
}

export const xmlChildrenParser = (collections: HTMLCollection) => {
  var currentData: { [x: string]: any } = {}

  for (let children of Array.from(collections)) {
    let attributes: { [x: string]: string | number } = {}

    // 属性
    if (children.attributes.length) {
      for (let attribute of Array.from(children.attributes)) {
        let value = isDecimalNumber(attribute.value)
          ? Number(attribute.value)
          : attribute.value
        attributes[attribute.name] = value
      }
    }

    // 子要素
    if (children.children.length) {
      let deepData = Object.assign(
        {},
        xmlChildrenParser(children.children),
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
      let value = isDecimalNumber(children.innerHTML)
        ? Number(children.innerHTML)
        : children.innerHTML
      currentData[children.tagName] = value
    }
  }

  return currentData
}

/**
 * Fetch
 */
export async function fetchCore(options: FetchCoreRequest) {
  const url = new URL(options.url)
  const { request = {}, responseType } = options

  if (options.qs) {
    Object.entries(options.qs).forEach(([name, value]) =>
      url.searchParams.append(name, String(value))
    )
  }

  if (options.formData) {
    const formData = new FormData()

    Object.entries(options.formData).forEach(([name, value]) =>
      formData.append(name, String(value))
    )

    request.body = formData
  }

  const response = await fetch(new Request(url.href, options.request))

  if (!response.ok) {
    return Promise.reject(new Error(response.statusText))
  }

  return response[responseType]()
}

/**
 * XHR
 */
export async function XHRCore({
  method = 'GET',
  async = true,
  withCredentials = false,
  ...request
}: XHRCoreRequest) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const url = new URL(request.url)
    let formData = new FormData()

    if (request.qs) {
      Object.entries(request.qs).forEach(([name, value]) =>
        url.searchParams.append(name, String(value))
      )
    }

    if (request.body) {
      if (isPlainObject(request.body)) {
        Object.entries(request.body).forEach(([name, value]) =>
          formData.append(name, String(value))
        )
      } else {
        formData = request.body
      }
    }

    xhr.open(method, url.href, async)

    if (request.headers) {
      Object.entries(request.headers).forEach(([name, value]) =>
        xhr.setRequestHeader(name, String(value))
      )
    }

    if (request.timeout) {
      xhr.timeout = request.timeout
    }

    xhr.withCredentials = withCredentials || false
    xhr.responseType = request.responseType || ''

    xhr.onload = () => {
      if (/^2\d{2}$/.test(`${xhr.status}`)) {
        resolve(xhr.response)
      } else {
        reject(new Error('XHR HTTP'))
      }

      xhr.abort()
    }

    xhr.onerror = (err) => {
      reject(new Error('Error'))
      console.error(err)
    }

    xhr.ontimeout = () => reject(new Error('XHR Timeout'))

    xhr.send(formData)
  })
}

export const fetchClient = async ({
  viaBackground,
  request,
}: {
  viaBackground: boolean
  request: FetchCoreRequest
}) => {
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

    if (has(res, 'error')) {
      return Promise.reject(new Error(get(res, 'message')))
    }

    return res
  } else {
    return fetchCore(request).catch((err) => Promise.reject(err))
  }
}

export const XHRClient = async ({
  viaBackground,
  request,
}: {
  viaBackground: boolean
  request: XHRCoreRequest
}): Promise<any> => {
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

    if (has(res, 'error')) {
      Promise.reject(new Error(get(res, 'message')))
    }

    return res
  } else {
    return XHRCore(request).catch((err) => Promise.reject(err))
  }
}
