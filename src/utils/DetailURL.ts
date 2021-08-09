export class DetailURL {
  url?: URL

  constructor(url: string) {
    try {
      this.url = new URL(url)
    } catch (e) {
      console.error(e)
    }
  }

  getContentDir() {
    if (!this.url) {
      return undefined
    }

    const dir = this.url.pathname
      .split('/')
      .filter((i) => i.length > 0)
      .shift()

    switch (dir) {
      case 'watch':
      case 'mylist':
      case 'search':
        return dir

      default:
        return undefined
    }
  }

  getContentId() {
    const rootDir = this.getContentDir()

    if (!this.url) {
      return undefined
    }

    switch (rootDir) {
      case 'mylist':
      case 'watch':
      case 'search':
        return this.url.pathname.split('/').pop()

      default:
        return undefined
    }
  }

  hasDir(...req: string[]) {
    const dir = this.getContentDir()

    return dir && req.includes(dir)
  }

  get isNicofinder() {
    return this.url && this.url.hostname.endsWith('nicofinder.net')
  }

  get isNiconico() {
    return this.url && this.url.hostname.endsWith('nicovideo.jp')
  }

  get isNicovideo() {
    return this.url && this.url.hostname === 'www.nicovideo.jp'
  }
}

export const isDecimalNumber = (string: string) => /^(?!0)\d+$/.test(string)

export const decodeURLParams = (paramsString: string) => {
  const searchParams = new URLSearchParams(paramsString)
  const result: {
    [key: string]: string | number
  } = {}

  searchParams.forEach((value, key) => {
    result[key] = isDecimalNumber(value) ? Number(value) : value
  })

  return result
}
