class QueueManager {
  constructor() {
    this.pushEmbeddedAPI();
    chrome.runtime.onMessage.addListener(this.onChromeMessage);
    window.addEventListener('message', this.onAPIMessage);
  }

  onChromeMessage = (request, sender, sendResponse) => {
    switch (request.type) {
      case 'appendQueue': {
        const targetOrigin = new URL('http://www.nicofinder.net');

        if (process.env.NODE_ENV === 'development') {
          targetOrigin.hostname = targetOrigin.hostname.replace('www', 'dev');
        }

        this.iframe.contentWindow.postMessage(request, targetOrigin);
        break;
      }
    }
  }

  onAPIMessage = (e) => {
    if (!toString.call(e.data).includes('Object') || !e.data.hasOwnProperty('type')) return;

    switch (e.data.type) {
      case 'successAppendQueue': {
        const video = e.data.payload;
        const thumbnailUrl = video.largeThumbnail ? `${video.thumbnailUrl}.L` : video.thumbnailUrl;

        chrome.runtime.sendMessage({
          type: 'notification',
          data: {
            title: '動画を追加しました',
            options: {
              icon: thumbnailUrl,
              body: video.title
            }
          }
        });
        break;
      }
    }
  }

  pushEmbeddedAPI() {
    const iframe = document.createElement('iframe');
    const src = new URL('http://www.nicofinder.net/api/');

    if (process.env.NODE_ENV === 'development') {
      src.hostname = src.hostname.replace('www', 'dev');
    }

    iframe.id = 'nicofinder-embeddedAPI';
    iframe.src = src;
    iframe.hidden = true;
    this.iframe = iframe;

    (document.body || document.documentElement).appendChild(iframe);
  }
}

new QueueManager();
