// @flow

type BaseUrl = {
  web: string,
  res: string,
  dic: string,
  flapi: string,
  live: string,
  com: string,
  ch: string,
  secureCh: string,
  commons: string,
  commonsAPI: string,
  embed: string,
  ext: string,
  nicoMs: string,
  ichiba: string,
  uadAPI: string,
  ads: string,
  account: string,
  secure: string,
  ex: string,
  qa: string,
  publicAPI: string,
  app: string,
  appClientAPI: string,
  point: string,
  enquete: string,
  notification: string,
  upload: string,
  sugoiSearchSystem: string,
  nicosummary: string,
  nicoad: string,
  nicoadAPI: string,
  secureDCDN: string,
}

type I18N = {
  language: string,
  locale: string,
  area: string,
  footer: string,
}

export type WatchEnv = {
  baseURL: BaseUrl,
  playlistToken: string,
  i18n: I18N,
  urls: Urls,
  isMonitoringLogUser: boolean,
  frontendId: number,
  frontendVersion: string,
}

type Urls = {
  playerHelp: string,
}
