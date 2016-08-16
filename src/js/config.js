export const regExp = {
  nicovideo: {
    watch: /^https?:\/\/(www|sp).nicovideo.jp\/watch\/(\d{10}|(sm|so|nm)\d+)/,
    mylist: /^https?:\/\/(www|sp).nicovideo.jp\/mylist\/(\d+)/,
    content: /^https?:\/\/(www|sp).nicovideo.jp\/(watch|mylist)\/(\d+|(sm|so|nm)\d+)/
  },
  nicofinder: {
    host: /^.*\.nicofinder\.net$/,
    v2: /^\/(watch|player)\/(\d{10}|[a-z]{2}\d+)$/
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
      recordCommentHistory: true
    }
  }
}
