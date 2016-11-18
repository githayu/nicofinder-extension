import { Utils, DetailURL } from './utils';
import { baseURL, defaultStorage } from './config';

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
    chrome.runtime.onMessage.addListener(this.messenger.bind(this));

    // リダイレクト
    chrome.webRequest.onBeforeRequest.addListener(this.onBeforeRequest.bind(this), Background.webRequestOptions, [
      'blocking'
    ]);

    chrome.webRequest.onBeforeSendHeaders.addListener(this.onBeforeSendHeaders.bind(this), Background.webRequestOptions, [
      'requestHeaders'
    ]);

    chrome.webRequest.onHeadersReceived.addListener(this.onHeadersReceived.bind(this), Background.webRequestOptions, [
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
        const detailURL = new DetailURL(info.linkUrl);

        if (detailURL.isNiconico && detailURL.hasDir('watch', 'mylist')) {
          chrome.tabs.create({
            url: [
              baseURL.nicofinder.top,
              detailURL.getContentDir(),
              detailURL.getContentId()
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
        const detailURL = new DetailURL(info,linkUrl);

        if (detailURL.isNiconico && detailURL.hasDir('watch')) {
          chrome.tabs.create({
            url: `${baseURL.nicofinder.top}/comment/${detailURL.getContentId()}`
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
        Utils.xhr({
          url: baseURL.nicoapi.videoInfo,
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

      // 移動後のURLを確認
      const detailURL = new DetailURL(details.url);
      const contentDir = detailURL.getContentDir();
      const contentId = detailURL.getContentId();

      if (detailURL.isNiconico) {
        if (detailURL.hasDir(...this.store.redirectList)) {
          let url = new URL(baseURL.nicofinder.top);

          url.pathname = `${contentDir}/${contentId}`;

          redirectRequest = Object.assign({}, redirectRequest, {
            isRedirect: true,
            redirectUrl: url.href,
            detailURL: detailURL
          });
        }
      }

      if (detailURL.isNicofinder) {
        if (this.store.webFeatures && contentDir === 'search') {
          let url = new URL(details.url);
          let query = decodeURIComponent(url.pathname.split('/').pop());

          url.pathname = '/next-search/';
          url.searchParams.append('query', query);

          redirectRequest = Object.assign({}, redirectRequest, {
            isRedirect: true,
            redirectUrl: url.href,
            detailURL: detailURL
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

      if (referer !== undefined && redirectRequest.hasOwnProperty('redirectUrl')) {
        let detailURL = new DetailURL(referer.value);
        let redirectCheck = [
          detailURL.url.hostname !== redirectRequest.detailURL.url.hostname,
          detailURL.getContentDir() === redirectRequest.detailURL.getContentDir()
        ];

        if (redirectCheck.every(i => i)) {
          redirectRequest.isRedirect = false;
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
