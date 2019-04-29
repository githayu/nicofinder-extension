declare namespace nicovideo {
  export interface WatchEnv {
    baseURL: BaseUrl
    playlistToken: string
    i18n: I18N
    urls: Urls
    isMonitoringLogUser: boolean
    frontendId: number
    frontendVersion: string
  }
}

interface BaseUrl {
  web: string
  res: string
  dic: string
  flapi: string
  live: string
  com: string
  ch: string
  secureCh: string
  commons: string
  commonsAPI: string
  embed: string
  ext: string
  nicoMs: string
  ichiba: string
  uadAPI: string
  ads: string
  account: string
  secure: string
  ex: string
  qa: string
  publicAPI: string
  app: string
  appClientAPI: string
  point: string
  enquete: string
  notification: string
  upload: string
  sugoiSearchSystem: string
  nicosummary: string
  nicoad: string
  nicoadAPI: string
  secureDCDN: string
}

interface I18N {
  language: string
  locale: string
  area: string
  footer: string
}

interface Urls {
  playerHelp: string
}
