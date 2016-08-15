import { isDecimalNumber } from '../../js/utils';

export default class NicoAPI {
  constructor(video) {
    this.video = video;
  }

  fetch(options) {
    var url = new URL(options.url);

    if ('qs' in options) {
      Object.keys(options.qs).forEach(key => url.searchParams.append(key, options.qs[key]));
    }

    return fetch(url, options.request)
    .then(res => {
      if (res.status !== 200) return Promise.reject({
        status: false,
        code: res.status
      });

      return res[options.type]();
    }).catch(err => {
      return Promise.reject({
        status: false,
        code: err.code ? err.code : 'native',
        error: err.stack
      })
    });
  }

  xhr(request) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest(),
          url = new URL(request.url);

      request = Object.assign({}, {
        method: 'GET',
        sendQuery: null
      }, request);

      if ('qs' in request) {
        switch (request.method) {
          case 'GET': {
            Object.keys(request.qs).forEach(key => url.searchParams.append(key, request.qs[key]));
            break;
          }

          case 'POST': {
            request.sendQuery = Object.entries(request.qs).map(([key, val]) => [key, val].join('='));
            break;
          }
        }
      }

      xhr.open(request.method, url, true);

      if (request.timeout) xhr.timeout = request.timeout;

      xhr.onload = e => {
        if (xhr.status === 200 || xhr.status === 304) {
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

      xhr.ontimeout = e => reject({
        status: false,
        code: 'timeout'
      });

      xhr.send(request.sendQuery);
    });
  }

  async getflv() {
    var data = await this.fetch({
      url: 'http://flapi.nicovideo.jp/api/getflv',
      qs: {
        v: this.video.mainThreadId,
        eco: (this.video.movieType === 'flv') ? 1 : 0
      },
      type: 'text',
      request: {
        credentials: 'include'
      }
    });

    var result = {};

    data.split('&').forEach(query => {
      var [key, value] = query.split('=');
      result[key] = isDecimalNumber(value) ? Number(value) : decodeURIComponent(value);
    });

    return result;
  }

  async watch() {
    var id = this.video.id.startsWith('so') ? this.video.mainThreadId : this.video.id;

    return await this.xhr({
      url: `http://www.nicovideo.jp/watch/${id}`,
      qs: {
        watch_harmful: 1,
        eco: (this.video.movieType === 'flv') ? 1 : 0
      },
      type: 'text'
    });
  }

  async storyboard(url) {
    return await this.xhr({
      url,
      type: 'xml',
      qs: {
        sb: 1
      }
    }).then(xml => {
      var xmlChildrenParser = collections => {
        var currentData = {};

        for (let children of collections) {
          let attributes = {};

          // 属性
          if (children.attributes.length) {
            for (let attribute of children.attributes) {
              let value = isDecimalNumber(attribute.textContent) ? Number(attribute.textContent) : attribute.textContent;
              attributes[attribute.name] = value;
            }
          }

          // 子要素
          if (children.children.length) {
            let deepData = Object.assign({}, xmlChildrenParser(children.children), attributes);

            // 複数の同名タグが存在
            if (Array.from(collections).filter(element => element.tagName === children.tagName).length > 1) {
              if (children.tagName in currentData === false) currentData[children.tagName] = [];
              currentData[children.tagName].push(deepData);
            } else {
              currentData[children.tagName] = Object.assign({}, currentData[children.tagName], deepData);
            }
          } else {
            let value = isDecimalNumber(children.textContent) ? Number(children.textContent) : children.textContent;
            currentData[children.tagName] = value;
          }
        }

        return currentData;
      }

      return xmlChildrenParser(xml.children).smile;
    });
  }

  async _videos() {
    var headers = new Headers();
    headers.append('Content-Type', 'application/json');

    return await this.fetch({
      url: `https://api.nicofinder.net/v2/videos`,
      type: 'json',
      request: {
        method: 'post',
        headers,
        body: JSON.stringify({
          id: [ this.video.id ]
        })
      }
    });
  }
}
