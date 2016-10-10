import utils from './utils';
import { define, defaultStorage } from './config';

class Background {
  static webRequestOptions = {
    urls: [
      '*://*.nicovideo.jp/*',
      '*://*.nicofinder.net/*'
    ],
    types: [
      'main_frame'
    ]
  };

  constructor() {
    this.store = {};
    this.redirectMap = new Map();

    // I/O
    chrome.runtime.onMessage.addListener(::this.messenger);

    // リダイレクト
    chrome.webRequest.onBeforeRequest.addListener(::this.onBeforeRequest, Background.webRequestOptions, [
      'blocking'
    ]);

    // リダイレクト判定
    chrome.webRequest.onBeforeSendHeaders.addListener(::this.onBeforeSendHeaders, Background.webRequestOptions, [
      'requestHeaders'
    ]);

    // リダイレクトキャンセル
    chrome.webRequest.onHeadersReceived.addListener(::this.onHeadersReceived, Background.webRequestOptions, [
      'blocking',
      'responseHeaders'
    ]);

    // Storage
    chrome.storage.local.get(defaultStorage.extension.local, storage =>
      Object.entries(storage).forEach(([name, value]) => {
        this.store[name] = value
      })
    );

    // Storage change
    chrome.storage.onChanged.addListener((changes, namespace) => {
      for (let name in changes) {
        this.store[name] = changes[name].newValue;
      }
    });

    // Nicofinder で対応するページを開く
    chrome.contextMenus.create({
      title: 'Nicofinderで開く',
      type: 'normal',
      contexts: ['link'],
      targetUrlPatterns: ['*://*.nicovideo.jp/*'],
      onclick: info => {
        var matchGroup = utils.getMatchURL('nicovideo', info.linkUrl);

        if (matchGroup !== false && ['watch', 'mylist'].includes(matchGroup.content)) {
          chrome.tabs.create({
            url: [
              define.nicofinder.host,
              matchGroup.content,
              matchGroup.match[2]
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
        var matchGroup = utils.getMatchURL('nicovideo', info.linkUrl);

        if (matchGroup !== false && matchGroup.content === 'watch') {
          chrome.tabs.create({
            url: [
              define.nicofinder.host,
              'comment',
              matchGroup.match[2]
            ].join('/')
          });
        }
      }
    });
  }

  messenger(request, sender, sendResponse) {
    switch (request.type) {
      case 'getBackgroundData': {
        let response = request.data in this ? this[request.data] : null;
        sendResponse(response);
        break;
      }

      case 'fetchVideoAPI': {
        utils.xhr({
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
    }
  }

  onBeforeRequest(details) {
    if (this.store.redirect) {
      var redirectRequest = {
        url: details.url,
        isRedirect: false
      };

      var nicovideoMatch = utils.getMatchURL('nicovideo', details.url);
      var nicofinderMatch = utils.getMatchURL('nicofinder', details.url);

      if (nicovideoMatch !== false) {
        if (this.store.redirectList.includes(nicovideoMatch.content)) {
          let url = new URL(define.nicofinder.host);

          url.pathname = `${nicovideoMatch.content}/${nicovideoMatch.match[2]}`;

          redirectRequest = Object.assign({}, redirectRequest, {
            isRedirect: true,
            redirectUrl: url.href,
            redirectMatch: nicovideoMatch
          });
        }
      }

      if (nicofinderMatch !== false) {
        if (this.store.webFeatures && nicofinderMatch.content === 'search') {
          let url = new URL(details.url);
          let query = decodeURIComponent(url.pathname.split('/').pop());

          url.pathname = '/next-search/';
          url.searchParams.append('query', query);

          redirectRequest = Object.assign({}, redirectRequest, {
            isRedirect: true,
            redirectUrl: url.href,
            redirectMatch: nicofinderMatch
          });
        }
      }

      this.redirectMap.set(details.requestId, redirectRequest);
    }
  }

  onBeforeSendHeaders(details) {
    if (this.store.redirect) {
      let redirectRequest = this.redirectMap.get(details.requestId);
      let referer = details.requestHeaders.find(item => item.name === 'Referer');

      if (referer !== undefined && 'redirectUrl' in redirectRequest) {
        let matchGroup = utils.getMatchURL('nicofinder', referer.value);

        if (redirectRequest.redirectMatch.content === matchGroup.content) {
          redirectRequest.isRedirect = matchGroup === false;
        }
      }
    }
  }

  onHeadersReceived(details) {
    if (this.store.redirect) {
      let redirectRequest = this.redirectMap.get(details.requestId);

      if (redirectRequest.isRedirect) {
        return {
          redirectUrl: redirectRequest.redirectUrl
        }
      }

      this.redirectMap.delete(details.requestId);
    }
  }
}

new Background();
