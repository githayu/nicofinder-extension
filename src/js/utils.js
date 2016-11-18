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

  static decodeURLParams(str) {
    var result = {};

    (str.startsWith('?') ? str.slice(1) : str).split('&').forEach(query => {
      var [key, value] = query.split('=');
      result[key] = this.isDecimalNumber(value) ? Number(value) : decodeURIComponent(value);
    });

    return result;
  }

  static fetch(options) {
    var url = new URL(options.url);

    if ('qs' in options) {
      Object.entries(options.qs).forEach(([name, value]) => url.searchParams.append(name, value));
    }

    return fetch(url, options.request)
    .then(res => {
      if (res.status !== 200) return Promise.reject(res);

      return res[options.type]();
    }).catch(data => {
      return Promise.reject({ data });
    });
  }


  static xhr(request) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest(),
          url = new URL(request.url);

      request = Object.assign({}, {
        method: 'get',
        formData: new FormData()
      }, request);

      if ('qs' in request) {
        Object.entries(request.qs).forEach(([name, value]) => url.searchParams.append(name, value));
      }

      if ('body' in request) {
        if (toString.call(request.body).includes('Object')) {
          Object.entries(request.qs).forEach(([name, value]) => request.formData.append(name, value));
        } else {
          request.formData = request.body;
        }
      }

      xhr.open(request.method, url, true);

      switch (request.type) {
        case 'xml':
          xhr.setRequestHeader('Content-Type', 'application/xml');
          break;

        case 'json':
          xhr.setRequestHeader('Content-Type', 'application/json');
          break;
      }

      if (request.timeout) xhr.timeout = request.timeout;

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201 || xhr.status === 304) {
          switch (request.type) {
            case 'xml':
              resolve(xhr.responseXML);
              break;

            case 'text':
              resolve(xhr.responseText);
              break;

            case 'json':
              resolve(JSON.parse(xhr.responseText));
              break;
          }
        } else {
          reject({
            status: false,
            code: xhr.status
          });
        }

        xhr.abort();
      }

      xhr.onerror = e => reject({
        status: false,
        code: 'native',
        detail: e
      });

      xhr.ontimeout = () => reject({
        status: false,
        code: 'timeout'
      });

      xhr.send(request.formData);
    });
  };

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
