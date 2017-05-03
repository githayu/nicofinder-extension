import { Utils, DetailURL } from './utils';
import { baseURL, defaultStorage } from './config';
import { fetchVideoInfo } from './niconico/api';

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

    // 拡張機能チェック
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      if (message.type === 'isInstalled') {
        sendResponse(true);
      }
    });

    // 外部接続の中継
    chrome.runtime.onConnectExternal.addListener(port => {
      if (port.name === 'player') {
        port.onMessage.addListener(msg => {
          const tabPort = chrome.tabs.connect(port.sender.tab.id, {
            name: port.name
          });

          // コンテンツスクリプトからのレスポンスを外部へ渡す
          tabPort.onMessage.addListener(tabMsg => port.postMessage(tabMsg));

          // 外部からのリクエストをコンテンツスクリプトへ渡す
          tabPort.postMessage(msg);
        });
      }
    });

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

    // 再生キューに追加
    chrome.contextMenus.create({
      title: '再生キューに追加',
      type: 'normal',
      contexts: ['link'],
      targetUrlPatterns: [
        '*://*.nicofinder.net/watch/*',
        '*://www.nicovideo.jp/watch/*',
        '*://nico.ms/*'
      ],
      onclick: async (info) => {
        const detailURL = new DetailURL(info.linkUrl);

        if (detailURL.hasDir('watch')) {
          const [response, tabs] = await Promise.all([
            fetchVideoInfo(detailURL.getContentId()),
            Utils.getActiveTabs()
          ]);

          const videoInfo = response.nicovideo_video_response;
          const isOkay = videoInfo['@status'] === 'ok';
          const isDeleted = videoInfo.video.deleted != 0;
          const isPlayable = videoInfo.video.vita_playable === 'OK';

          if (!isOkay || isDeleted || !isPlayable) {
            return alert('この動画は追加できません');
          }

          const video = {
            commentCount: Number(videoInfo.thread.num_res),
            description: videoInfo.video.description,
            duration: Number(videoInfo.video.length_in_seconds),
            id: videoInfo.video.id,
            largeThumbnail: videoInfo.video.options['@large_thumbnail'] == 1,
            myListCount: Number(videoInfo.video.mylist_counter),
            published: Date.parse(videoInfo.video.first_retrieve),
            tags: videoInfo.tags.tag_info.map(tag => { tag: tag.tag }),
            thumbnailUrl: videoInfo.video.thumbnail_url,
            title: videoInfo.video.title,
            viewCount: Number(videoInfo.video.view_counter)
          };

          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'appendQueue',
            payload: video
          });
        }
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
      title: 'コメント解析を開く',
      type: 'normal',
      contexts: ['link'],
      targetUrlPatterns: ['http://www.nicovideo.jp/watch/*'],
      onclick: info => {
        const detailURL = new DetailURL(info.linkUrl);

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
        fetchVideoInfo(request.data).then(res => {
          this.videoInfo = res.nicovideo_video_response;
          sendResponse(res.nicovideo_video_response);
        });

        return true;
      }

      case 'isHTML5NicoVideo': {
        chrome.cookies.getAll({
          domain: 'nicovideo.jp',
          name: 'watch_html5'
        }, (cookies) => {
          if (!cookies.length) {
            sendResponse(false);
          } else {
            const isHTML5 = cookies[0].value === '1';
            sendResponse(isHTML5);
          }
        });

        return true;
      }

      case 'getUserSession': {
        chrome.cookies.getAll({
          domain: 'nicovideo.jp',
          name: 'user_session'
        }, (cookies) => {
          if (!cookies.length) {
            sendResponse(false);
          } else {
            sendResponse(cookies[0].value);
          }
        });

        return true;
      }

      case 'notification': {
        const n = new Notification(request.data.title, request.data.options);
        setTimeout(n.close.bind(n), 5000);
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
