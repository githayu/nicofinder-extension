import { fetchPastThreads } from './fetchPastThreads'
import { getNicoUserSession } from './getNicoUserSession'
import { DetailURL } from '../utils/DetailURL'
import { NicoVideoAPI } from '../libs'

// 外部メッセージ
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    switch (message.type) {
      case 'isInstalled': {
        getNicoUserSession().then((us) => {
          sendResponse({
            isLoggedIn: us !== null,
          })
        })

        break
      }

      case 'fetchWatchData': {
        getNicoUserSession().then(async (us) => {
          const api = new NicoVideoAPI(message.payload)

          if (us) {
            const result = await api.run(us)

            sendResponse(result)
          } else {
            sendResponse(null)
          }
        })
        break
      }

      case 'fetchPastThreadRequest':
        fetchPastThreads(message.payload, sendResponse)
        break
    }

    return true
  }
)

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'open-comment': {
      if (!info.linkUrl) {
        return
      }

      const detailURL = new DetailURL(info.linkUrl)
      const id = detailURL.getContentId()

      if (!id) return

      if (detailURL.isNiconico && detailURL.hasDir('watch')) {
        chrome.tabs.create({
          url: `https://nicofinder.net/comment/${id}`,
        })
      }

      break
    }
  }
})

// Nicofinder コメント解析ページを開く
chrome.contextMenus.create({
  title: 'コメント解析を開く',
  type: 'normal',
  contexts: ['link', 'page'],
  targetUrlPatterns: ['*://www.nicovideo.jp/watch/*'],
  id: 'open-comment',
})

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'https://nicofinder.net' })
})
