import chrome from './initialize';
import { validateURL } from './utils';
import { define, defaultStorage } from './config';

class Background {
  constructor() {

    // I/O
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case 'getBackgroundData': {
          let response = request.data in this ? this[request.data] : null;
          sendResponse(response);
          break;
        }

        case 'fetchVideoAPI': {
          this.xhr({
            url: define.nicoapi.videoInfo,
            method: 'post',
            type: 'json',
            qs: {
              v: request.data,
              __format: 'json'
            }
          }).then(res => {
            this.videoInfo = res.nicovideo_video_response;
            sendResponse(res.nicovideo_video_response);
          });

          return true;
          break;
        }

        case 'sendBackgroundDebugger': {
          console.log(request.data);
          break;
        }
      }
    });


    // Storage
    chrome.storage.local.get(defaultStorage.extension.local, storage =>
      Object.entries(storage).forEach(([name, value]) => {
        this[name] = value
      })
    );


    // Storage change
    chrome.storage.onChanged.addListener((changes, namespace) => {
      for (let name in changes) {
        this[name] = changes[name].newValue;
      }
    });


    // Redirect
    chrome.webRequest.onBeforeRequest.addListener(details => {
      if (this.redirect === false) return;

      // Redirect cancel
      var url = new URL(details.url);

      if ('searchParams' in url) {
        if (url.searchParams.has('nicoview') && url.searchParams.get('nicoview') == 1) return;
      } else if (url.search.length) {
        if (url.search.replace('?', '').split('&').includes('nicoview=1')) return;
      }

      var match,
          redirectUrl;

      if (match = validateURL(details.url, { domain: 'nicovideo', name: 'content' })) {
        redirectUrl = Object.values({
          domain: define.nicofinder.host,
          content: match[2],
          id: match[3]
        }).join('/');
      }

      if (redirectUrl && (this.redirectList.length === 0 || this.redirectList.includes(match[2]))) {
        return { redirectUrl }
      }
    }, {
      urls: ['http://*.nicovideo.jp/*'],
      types: ['main_frame']
    }, ['blocking']);


    // Nicofinder で対応するページを開く
    chrome.contextMenus.create({
      title: 'Nicofinderで開く',
      type: 'normal',
      contexts: ['link'],
      targetUrlPatterns: ['*://*.nicovideo.jp/*'],
      onclick: info => {
        var match = validateURL(info.linkUrl, {
          domain: 'nicovideo',
          name: 'content'
        });

        if (Array.isArray(match)) {
          chrome.tabs.create({
            url: [
              define.nicofinder.host,
              match[2],
              match[3]
            ].join('/')
          });
        }
      }
    });


    // Nicofinder コメント解析ページを開く
    chrome.contextMenus.create({
      title: 'コメント解析',
      type: 'normal',
      contexts: ['link'],
      targetUrlPatterns: ['http://www.nicovideo.jp/watch/*'],
      onclick: info => {
        var match = validateURL(info.linkUrl, {
          domain: 'nicovideo',
          name: 'watch'
        });

        if (Array.isArray(match)) {
          chrome.tabs.create({
            url: [
              define.nicofinder.host,
              'comment',
              match[2]
            ].join('/')
          });
        }
      }
    });
  }

  xhr(request) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest(),
          url = new URL(request.url);

      request = Object.assign({}, {
        method: 'get',
        formData: new FormData()
      }, request);

      if ('qs' in request) {
        switch (request.method) {
          case 'get': {
            Object.entries(request.qs).forEach(([name, value]) => url.searchParams.append(name, value));
            break;
          }

          case 'post': {
            Object.entries(request.qs).forEach(([name, value]) => request.formData.append(name, value));
            break;
          }
        }
      }

      xhr.open(request.method, url, true);

      if (request.timeout) xhr.timeout = request.timeout;

      xhr.onload = () => {
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

      xhr.ontimeout = () => reject({
        status: false,
        code: 'timeout'
      });

      xhr.send(request.formData);
    });
  }
}

var background = new Background();
