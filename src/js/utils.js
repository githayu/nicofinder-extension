import { regExpItems } from './config';

export class DetailURL {
  constructor(url) {
    try {
      this.url = new URL(url);
    } catch(e) {
      return false;
    }
  }

  getContentDir() {
    const dir = this.url.pathname.split('/').filter(i => i.length > 0).shift();

    switch (dir) {
      case 'watch':
      case 'mylist':
      case 'search':
        return dir;

      default:
        return false;
    }
  }

  getContentId() {
    const rootDir = this.getContentDir();

    switch (rootDir) {
      case 'mylist':
      case 'watch':
      case 'search':
        return this.url.pathname.split('/').pop();

      default:
        return false;
    }
  }

  hasDir(...req) {
    return req.includes(this.getContentDir());
  }

  get isNicofinder() {
    return this.url.hostname === 'www.nicofinder.net';
  }

  get isNiconico() {
    return this.url.hostname === 'www.nicovideo.jp';
  }
}

export class Utils {
  static getActiveTabs() {
    return new Promise(resolve => chrome.tabs.query({
      active: true,
      currentWindow: true
    }, resolve));
  }

  static isDecimalNumber(string) {
    return /^(?!0)\d+$/.test(string);
  }

  static decodeURLParams(paramsString) {
    const searchParams = new URLSearchParams(paramsString);

    const resultParams = Array.from(searchParams).reduce((result, [key, value]) => {
      result[key] = this.isDecimalNumber(value) ? Number(value) : value;
      return result;
    }, {});

    return resultParams;
  }

  static async fetch(options) {
    const url = new URL(options.url);

    if (options.hasOwnProperty('qs')) {
      Object.entries(options.qs).forEach(([name, value]) =>
        url.searchParams.append(name, value)
      );
    }

    if (options.request.hasOwnProperty('body') && toString.call(options.request.body).includes('Object')) {
      const formData = new FormData();

      Object.entries(options.request.body).forEach(([name, value]) =>
        formData.append(name, value)
      );

      options.request.body = formData;
    }

    const request = new Request(url, options.request);
    const response = await fetch(request);

    if (!response.ok) {
      return Promise.reject(new Error('Fetch Error'));
    }

    return Promise.resolve(await response[options.responseType]());
  }

  /**
   * @param {Object} request
   * @param {String} request.method
   * @param {String} request.url
   * @param {String} request.responseType
   * @param {Object} request.qs
   * @param {Object} request.headers
   * @param {Object|FormData} request.body
   * @param {Number} request.timeout
   * @param {Boolean} request.async
   * @param {Boolean} request.withCredentials
   */
  static xhr(request) {
    return new Promise((resolve, reject) => {
      const defaultRequest = {
        method: 'GET',
        async: true,
        withCredentials: false
      };

      const xhr = new XMLHttpRequest();
      const url = new URL(request.url);
      let formData = new FormData();

      request = Object.assign({}, defaultRequest, request);

      if (request.hasOwnProperty('qs')) {
        Object.entries(request.qs).forEach(([name, value]) =>
          url.searchParams.append(name, value)
        );
      }

      if (request.hasOwnProperty('body')) {
        const type = toString.call(request.body);

        if (type.includes('Object')) {
          Object.entries(request.body).forEach(([name, value]) =>
            formData.append(name, value)
          );
        } else {
          formData = request.body;
        }
      }

      xhr.open(request.method, url, request.async);

      if (request.hasOwnProperty('headers')) {
        Object.entries(request.headers).forEach(([name, value]) =>
          xhr.setRequestHeader(name, value)
        );
      }

      if (request.hasOwnProperty('timeout')) {
        xhr.timeout = request.timeout;
      }

      xhr.withCredentials = request.withCredentials;

      xhr.onload = () => {
        if (/^2\d{2}$/.test(xhr.status)) {
          switch (request.responseType) {
            case 'xml':
              resolve(xhr.responseXML);
              break;

            case 'json':
              resolve(JSON.parse(xhr.responseText));
              break;

            default:
              resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`XHR HTTP Error: ${xhr.status}`));
        }

        xhr.abort();
      }

      xhr.onerror = (err) => reject(new Error(err.message));

      xhr.ontimeout = () => reject(new Error('XHR Timeout'));

      xhr.send(formData);
    });
  }

  static xmlChildrenParser(collections) {
    var currentData = {};

    for (let children of collections) {
      let attributes = {};

      // 属性
      if (children.attributes.length) {
        for (let attribute of children.attributes) {
          let value = this.isDecimalNumber(attribute.value) ? Number(attribute.value) : attribute.value;
          attributes[attribute.name] = value;
        }
      }

      // 子要素
      if (children.children.length) {
        let deepData = Object.assign({}, this.xmlChildrenParser(children.children), attributes);

        // 複数の同名タグが存在
        if (Array.from(collections).filter(element => element.tagName === children.tagName).length > 1) {
          if (children.tagName in currentData === false) currentData[children.tagName] = [];
          currentData[children.tagName].push(deepData);
        } else {
          currentData[children.tagName] = Object.assign({}, currentData[children.tagName], deepData);
        }
      } else {
        let value = this.isDecimalNumber(children.innerHTML) ? Number(children.innerHTML) : children.innerHTML;
        currentData[children.tagName] = value;
      }
    }

    return currentData;
  }
}
