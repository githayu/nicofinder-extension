// @flow

import { Utils, DetailURL } from 'js/utils'
import { baseURL, defaultStorage } from 'js/config'
import { fetchVideoInfo } from 'js/niconico/api'
import { getNicoUserSession, fetchPastThreads, myListManager } from 'js/scripts'
import { has } from 'lodash'

class Background {
  static webRequestOptions = {
    urls: ['*://*.nicovideo.jp/*', '*://*.nicofinder.net/*'],
    types: ['main_frame'],
  }

  store = {}
  redirectMap = new Map()
  videoInfo = {}

  constructor() {
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
          const tabPort = chrome.tabs.connect(
            port.sender.tab.id,
            {
              name: port.name,
            }
          )

          // コンテンツスクリプトからのレスポンスを外部へ渡す
          tabPort.onMessage.addListener((tabMsg) => port.postMessage(tabMsg))

          // 外部からのリクエストをコンテンツスクリプトへ渡す
          tabPort.postMessage(msg)
        })
      }
    })

    // I/O
    chrome.runtime.onMessage.addListener(this.messenger.bind(this))

    // リダイレクト
    chrome.webRequest.onBeforeRequest.addListener(
      this.onBeforeRequest.bind(this),
      Background.webRequestOptions,
      ['blocking']
    )

    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.onBeforeSendHeaders.bind(this),
      Background.webRequestOptions,
      ['requestHeaders']
    )

    chrome.webRequest.onHeadersReceived.addListener(
      this.onHeadersReceived.bind(this),
      Background.webRequestOptions,
      ['blocking', 'responseHeaders']
    )

    // Storage
    chrome.storage.local.get(defaultStorage.extension.local, (storage) =>
      Object.entries(storage).forEach(([name, value]) => {
        this.store[name] = value
      })
    )

    // Storage change
    chrome.storage.onChanged.addListener((changes) => {
      for (let name in changes) {
        this.store[name] = changes[name].newValue
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
        const detailURL = new DetailURL(info.linkUrl)

        if (detailURL.hasDir('watch')) {
          const id = detailURL.getContentId()

          if (!id) {
            return alert('コンテンツIDが見つかりません')
          }

          const [response, [tab]] = await Promise.all([
            fetchVideoInfo(id),
            Utils.getActiveTabs(),
          ])

          const videoInfo = response.nicovideo_video_response
          const isOkay = videoInfo['@status'] === 'ok'
          const isDeleted = videoInfo.video.deleted != 0
          const isPlayable = videoInfo.video.vita_playable === 'OK'

          if (!isOkay || isDeleted || !isPlayable) {
            return alert('この動画は追加できません')
          }

          const video = {
            commentCount: Number(videoInfo.thread.num_res),
            description: videoInfo.video.description,
            duration: Number(videoInfo.video.length_in_seconds),
            id: videoInfo.video.id,
            largeThumbnail: videoInfo.video.options['@large_thumbnail'] == 1,
            myListCount: Number(videoInfo.video.mylist_counter),
            published: Date.parse(videoInfo.video.first_retrieve),
            tags: videoInfo.tags.tag_info.map((tag) => {
              tag.tag
            }),
            thumbnailUrl: videoInfo.video.thumbnail_url,
            title: videoInfo.video.title,
            viewCount: Number(videoInfo.video.view_counter),
          }

          chrome.tabs.sendMessage(tab.id, {
            type: 'appendQueue',
            payload: video,
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
  }

  messenger(request, sender, sendResponse) {
    switch (request.type) {
      case 'backgroundFetch':
      case 'backgroundXHR': {
        const client =
          request.type === 'backgroundXHR'
            ? require('js/utils').XHRClient
            : require('js/utils').fetchClient

        client(request.payload)
          .then(sendResponse)
          .catch((err) =>
            sendResponse({
              error: true,
              message: err.message,
            })
          )

        return true
      }

      case 'fetchVideoInfo': {
        fetchVideoInfo(request.payload).then((res) => {
          this.videoInfo = res.nicovideo_video_response
          sendResponse(res.nicovideo_video_response)
        })

        return true
      }

      case 'getUserSession': {
        getNicoUserSession().then(sendResponse)

        return true
      }

      case 'notification': {
        const n = new window.Notification(
          request.data.title,
          request.data.options
        )
        setTimeout(n.close.bind(n), 5000)
      }
    }
  }

  onBeforeRequest(details) {
    if (this.store.redirect) {
      var redirectRequest = {
        url: details.url,
        isRedirect: false,
      }

      // 移動後のURLを確認
      const detailURL = new DetailURL(details.url)
      const contentDir = detailURL.getContentDir()
      const contentId = detailURL.getContentId()

      if (detailURL.isNiconico && contentDir && contentId) {
        if (detailURL.hasDir(...this.store.redirectList)) {
          let url = new URL(baseURL.nicofinder.top)

          url.pathname = `${contentDir}/${contentId}`

          redirectRequest = Object.assign({}, redirectRequest, {
            isRedirect: true,
            redirectUrl: url.href,
            detailURL: detailURL,
          })
        }
      }

      this.redirectMap.set(details.requestId, redirectRequest)
    }
  }

  onBeforeSendHeaders(details) {
    if (this.store.redirect) {
      let redirectRequest = this.redirectMap.get(details.requestId)
      let referer = details.requestHeaders.find(
        (item) => item.name === 'Referer'
      )

      if (referer !== undefined && has(redirectRequest, 'redirectUrl')) {
        let detailURL = new DetailURL(referer.value)
        let redirectCheck = [
          detailURL.url.hostname !== redirectRequest.detailURL.url.hostname,
          detailURL.getContentDir() ===
            redirectRequest.detailURL.getContentDir(),
        ]

        if (redirectCheck.every((i) => i)) {
          redirectRequest.isRedirect = false
        }
      }
    }
  }

  onHeadersReceived(details) {
    if (this.store.redirect) {
      let redirectRequest = this.redirectMap.get(details.requestId)

      if (has(redirectRequest, 'isRedirect')) {
        return {
          redirectUrl: redirectRequest.redirectUrl,
        }
      }

      this.redirectMap.delete(details.requestId)
    }
  }
}

new Background()
