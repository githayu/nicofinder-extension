export const regExpItems = {
  nicovideo: {
    domain: '^https?:\/\/(www|sp)\.nicovideo.jp',
    content: {
      watch: '\/watch\/(\\d{10}|[a-z]{2}\\d+)',
      mylist: '\/mylist\/(\\d+)',
    }
  },
  nicofinder: {
    domain: '^https?:\/\/([a-zA-Z0-9.-]+\.)?nicofinder\.net',
    content: {
      watch: '\/watch\/(\\d{10}|[a-z]{2}\\d+)',
      mylist: '\/mylist\/(\\d+)',
      search: '\/search\/(.*)',
      player: '\/player\/(\\d{10}|[a-z]{2}\\d+)'
    }
  }
};

export const define = {
  nicofinder: {
    host: 'http://www.nicofinder.net'
  },
  nicoapi: {
    videoInfo: 'http://api.ce.nicovideo.jp/nicoapi/v1/video.info'
  }
};

export const defaultStorage = {
  extension: {
    local: {
      redirect: false,
      redirectList: [],
      webFeatures: false
    }
  }
};
