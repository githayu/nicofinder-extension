class QueueManager {
  constructor() {
    chrome.runtime.onMessage.addListener(this.onMessageChrome.bind(this))
    window.addEventListener('message', this.onMessageWindow.bind(this))
  }

  async onMessageChrome(request) {
    if (!this.embedAPI) {
      this.embedAPI = await this.pushEmbedAPI()
    }

    switch (request.type) {
      case 'appendQueue': {
        const targetOrigin = new URL('http://www.nicofinder.net')

        if (process.env.NODE_ENV === 'development') {
          targetOrigin.hostname = targetOrigin.hostname.replace('www', 'dev')
        }

        this.embedAPI.contentWindow.postMessage(request, targetOrigin)
        break
      }
    }
  }

  onMessageWindow(e) {
    if (
      !toString.call(e.data).includes('Object') ||
      !e.data.hasOwnProperty('type')
    )
      return

    switch (e.data.type) {
      case 'successAppendQueue': {
        const video = e.data.payload
        const thumbnailUrl = video.largeThumbnail
          ? `${video.thumbnailUrl}.L`
          : video.thumbnailUrl

        chrome.runtime.sendMessage({
          type: 'notification',
          data: {
            title: '動画を追加しました',
            options: {
              icon: thumbnailUrl,
              body: video.title,
            },
          },
        })
        break
      }
    }
  }

  pushEmbedAPI() {
    const iframe = document.createElement('iframe')
    const src = new URL('http://www.nicofinder.net/api')

    if (process.env.NODE_ENV === 'development') {
      src.hostname = src.hostname.replace('www', 'dev')
    }

    iframe.id = 'nicofinder-embedAPI'
    iframe.src = src
    iframe.hidden = true
    ;(document.body || document.documentElement).appendChild(iframe)

    return new Promise((resolve) =>
      iframe.addEventListener('load', () => resolve(iframe))
    )
  }
}

new QueueManager()
