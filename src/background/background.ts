import {
  DetailURL,
  getActiveTabs,
  getNicoUserSession,
  fetchPastThreads,
  myListManager,
  API,
} from '../scripts'
import { baseURL, defaultStorage } from '../constants'
import { redirector, backgroundProxy, QueueManager } from './'

interface State {
  videoInfo?: nicovideo.API.VideoInfo['nicovideo_video_response']
  storage: {
    redirect: boolean
    redirectList: string[]
    [x: string]: any
  }
  redirectMap: Map<
    string,
    {
      url: string
      isRedirect: boolean
      toURL?: any
      redirectUrl?: string
    }
  >
  queueManager: QueueManager
}

export const state: State = {
  videoInfo: undefined,
  storage: {
    redirect: false,
    redirectList: ['watch', 'mylist'],
  },
  redirectMap: new Map(),
  queueManager: new QueueManager(),
}

const webRequestOptions: chrome.webRequest.RequestFilter = {
  urls: ['*://*.nicovideo.jp/*', '*://*.nicofinder.net/*'],
  types: ['main_frame'],
}

// 外部メッセージ
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    switch (message.type) {
      case 'isInstalled': {
        getNicoUserSession().then((us) =>
          sendResponse({
            isLoggedIn: us !== null,
          })
        )
        break
      }

      case 'fetchPastThreadRequest':
        fetchPastThreads(message.payload, sendResponse)
        break

      case 'fetchMyListGroupList':
      case 'fetchMyListItems':
      case 'appendMyListItem':
        myListManager(message, sendResponse)
        break
    }

    return true
  }
)

// 外部コネクト
chrome.runtime.onConnectExternal.addListener((port) => {
  if (port.name === 'player') {
    port.onMessage.addListener((msg) => {
      if (
        !port.sender ||
        !port.sender.tab ||
        port.sender.tab.id === undefined
      ) {
        return
      }

      const tabPort = chrome.tabs.connect(port.sender.tab.id, {
        name: port.name,
      })

      // コンテンツスクリプトからのレスポンスを外部へ渡す
      tabPort.onMessage.addListener((tabMsg) => port.postMessage(tabMsg))

      // 外部からのリクエストをコンテンツスクリプトへ渡す
      tabPort.postMessage(msg)
    })
  }
})

// 拡張機能内メッセージの中継
chrome.runtime.onMessage.addListener(backgroundProxy)

// リダイレクト
chrome.webRequest.onBeforeRequest.addListener(
  redirector.handleBeforeRequest,
  webRequestOptions,
  ['blocking']
)

chrome.webRequest.onHeadersReceived.addListener(
  redirector.handleHeadersReceived,
  webRequestOptions,
  ['blocking', 'responseHeaders']
)

// Storage
chrome.storage.local.get(defaultStorage.extension.local, (storage) =>
  Object.entries(storage).forEach(([name, value]) => {
    state.storage[name] = value
  })
)

// Storage change
chrome.storage.onChanged.addListener((changes) => {
  for (let name in changes) {
    state.storage[name] = changes[name].newValue
  }
})

// 再生キューに追加
chrome.contextMenus.create({
  title: '再生キューに追加',
  type: 'normal',
  contexts: ['link'],
  targetUrlPatterns: [
    '*://*.nicofinder.net/watch/*',
    '*://www.nicovideo.jp/watch/*',
    '*://nico.ms/*',
  ],
  onclick: async (info) => {
    if (!info.linkUrl) {
      return
    }

    const detailURL = new DetailURL(info.linkUrl)

    if (detailURL.hasDir('watch')) {
      const id = detailURL.getContentId()

      if (!id) {
        return alert('コンテンツIDが見つかりません')
      }

      const [response, [tab]] = await Promise.all([
        API.fetchVideoInfo(id),
        getActiveTabs(),
      ])

      if (!tab.id) {
        return alert('タブ取得エラー')
      }

      const videoInfo = response.nicovideo_video_response
      const isOkay = videoInfo['@status'] === 'ok'
      const isDeleted = videoInfo.video.deleted !== '0'
      const isPlayable = videoInfo.video.vita_playable === 'OK'

      if (!isOkay || isDeleted || !isPlayable) {
        return alert('この動画は追加できません')
      }

      state.queueManager.appendQueue({
        commentCount: Number(videoInfo.thread.num_res),
        description: videoInfo.video.description,
        duration: Number(videoInfo.video.length_in_seconds),
        id: videoInfo.video.id,
        largeThumbnail: videoInfo.video.options['@large_thumbnail'] === '1',
        myListCount: Number(videoInfo.video.mylist_counter),
        published: Date.parse(videoInfo.video.first_retrieve),
        tags: videoInfo.tags.tag_info.map((tag) => tag.tag),
        thumbnailUrl: videoInfo.video.thumbnail_url,
        title: videoInfo.video.title,
        viewCount: Number(videoInfo.video.view_counter),
      })
    }
  },
})

// Nicofinder で対応するページを開く
chrome.contextMenus.create({
  title: 'Nicofinderで開く',
  type: 'normal',
  contexts: ['link'],
  targetUrlPatterns: ['*://*.nicovideo.jp/*'],
  onclick: (info) => {
    if (!info.linkUrl) {
      return
    }

    const detailURL = new DetailURL(info.linkUrl)

    if (detailURL.isNiconico && detailURL.hasDir('watch', 'mylist')) {
      chrome.tabs.create({
        url: [
          baseURL.nicofinder.top,
          detailURL.getContentDir(),
          detailURL.getContentId(),
        ].join('/'),
      })
    }
  },
})

// Nicofinder コメント解析ページを開く
chrome.contextMenus.create({
  title: 'コメント解析を開く',
  type: 'normal',
  contexts: ['link'],
  targetUrlPatterns: ['*://www.nicovideo.jp/watch/*'],
  onclick: (info) => {
    if (!info.linkUrl) {
      return
    }

    const detailURL = new DetailURL(info.linkUrl)
    const id = detailURL.getContentId()

    if (!id) return

    if (detailURL.isNiconico && detailURL.hasDir('watch')) {
      chrome.tabs.create({
        url: `${baseURL.nicofinder.top}/comment/${id}`,
      })
    }
  },
})
