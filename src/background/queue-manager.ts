import { baseURL } from '../constants'

interface Video {
  commentCount: number
  description: string
  duration: number
  id: string
  largeThumbnail: boolean
  myListCount: number
  published: number
  tags: string[]
  thumbnailUrl: string
  title: string
  viewCount: number
}

interface WindowMessageEvent extends MessageEvent {
  data: {
    type: 'successAppendQueue'
    payload: Video
  }
}

class QueueManager {
  embedAPI?: HTMLIFrameElement

  constructor() {
    window.addEventListener('message', this.onMessageWindow)
  }

  appendQueue = async (video: Video) => {
    if (!this.embedAPI) {
      this.embedAPI = await this.pushEmbedAPI()
    }

    const targetOrigin = new URL('https://nicofinder.net')

    if (process.env.NODE_ENV === 'development') {
      targetOrigin.protocol = 'http:'
      targetOrigin.hostname = `dev.${targetOrigin.hostname}`
    }

    if (this.embedAPI.contentWindow) {
      this.embedAPI.contentWindow.postMessage(
        {
          type: 'appendQueue',
          payload: video,
        },
        targetOrigin.href
      )
    }
  }

  onMessageWindow = ({ data }: WindowMessageEvent) => {
    if (!data) {
      return
    }

    switch (data.type) {
      case 'successAppendQueue': {
        const video = data.payload
        const thumbnailUrl = video.largeThumbnail
          ? `${video.thumbnailUrl}.L`
          : video.thumbnailUrl

        chrome.notifications.create(
          {
            type: 'basic',
            title: '動画を追加しました',
            iconUrl: thumbnailUrl,
            message: video.title,
          },
          (notificationId) => {
            const handleClick = (id: string) => {
              if (notificationId === id) {
                chrome.tabs.create({
                  url: `${baseURL.nicofinder.top}/watch/${video.id}`,
                })

                chrome.notifications.clear(id)
              }
            }

            chrome.notifications.onClicked.addListener(handleClick)

            setTimeout(() => {
              chrome.notifications.onClicked.removeListener(handleClick)
              chrome.notifications.clear(notificationId)
            }, 5000)
          }
        )
        break
      }
    }
  }

  pushEmbedAPI(): Promise<HTMLIFrameElement> {
    const iframe = document.createElement('iframe')
    const src = new URL('https://nicofinder.net/api')

    if (process.env.NODE_ENV === 'development') {
      src.protocol = 'http:'
      src.hostname = `dev.${src.hostname}`
    }

    iframe.id = 'nicofinder-embedAPI'
    iframe.src = src.href
    iframe.hidden = true
    ;(document.body || document.documentElement).appendChild(iframe)

    return new Promise((resolve) =>
      iframe.addEventListener('load', () => resolve(iframe))
    )
  }
}

export default QueueManager
