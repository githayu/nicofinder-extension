import { Utils } from '../utils'
import { baseURL } from '../config'

/**
 * WatchAPIを取得する
 * @param {Object}  request
 * @param {String}  request.watchId
 * @param {String}  request.playlistToken
 * @param {Boolean} request.isEconomy
 */
export async function fetchWatchAPI(request) {
  const eco = request.isEconomy ? 1 : 0

  return await Utils.fetch({
    url: `http://www.nicovideo.jp/watch/${request.watchId}`,
    responseType: 'json',
    qs: {
      mode: 'pc_html5',
      eco: eco,
      playlist_token: request.playlistToken,
      watch_harmful: 2,
      continue_watching: 1,
    },
    request: {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  })
}

/**
 * WatchHTMLを取得する
 * @param {Object}  request
 * @param {String}  request.watchId
 * @param {Boolean} request.isEconomy
 */
export async function fetchWatchHTML(request) {
  const eco = request.isEconomy ? 1 : 0

  const watchHTML = await Utils.fetch({
    url: `http://www.nicovideo.jp/watch/${request.watchId}`,
    request: { credentials: 'include' },
    responseType: 'text',
    qs: {
      watch_harmful: 1,
      eco: eco,
    },
  })

  return new DOMParser().parseFromString(watchHTML, 'text/html')
}

/**
 * Storyboardを取得する
 * @param {string} url
 */
export async function fetchStoryboard(url) {
  const response = await Utils.xhr({
    url: url,
    qs: { sb: 1 },
    withCredentials: true,
    responseType: 'xml',
    headers: {
      'Content-Type': 'application/xml',
    },
  })

  const storyboardResult = Utils.xmlChildrenParser(response.children)

  if (storyboardResult.smile.status === 'ok') {
    return storyboardResult.smile
  }
}

/**
 * FlvInfoを取得する
 * @param {Object} params
 */
export async function fetchFlvInfo(params) {
  const paramsString = await Utils.fetch({
    url: baseURL.nicoapi.getflv,
    qs: params,
    request: { credentials: 'include' },
    responseType: 'text',
  })

  return Utils.decodeURLParams(paramsString)
}

/**
 * waybackkeyを取得する
 *
 * @export
 * @param {{thread: number}} params
 * @returns
 */
export function fetchWaybackkey(params) {
  return Utils.fetch({
    url: baseURL.nicoapi.getWaybackkey,
    request: {
      method: 'POST',
      credentials: 'include',
      body: params,
    },
    responseType: 'text',
  }).then((res) => Utils.decodeURLParams(res))
}

/**
 * 同期通信で再生終了時間を記録する
 * @param {String} watchId
 * @param {String} playbackPosition
 * @param {Srting} CSRFToken
 */
export async function recoadPlaybackPosition(
  watchId,
  playbackPosition,
  CSRFToken
) {
  return await Utils.xhr({
    url: baseURL.nicoapi.recoadPlaybackPosition,
    method: 'POST',
    async: false,
    responseType: 'json',
    withCredentials: true,
    body: {
      watch_id: watchId,
      playback_position: playbackPosition,
      csrf_token: CSRFToken,
    },
  })
}

/**
 * 動画情報を取得する
 * @param  {String} videoId
 */
export function fetchVideoInfo(videoId) {
  return Utils.fetch({
    url: baseURL.nicoapi.videoInfo,
    request: {
      method: 'POST',
      body: {
        v: videoId,
        __format: 'json',
      },
    },
    responseType: 'json',
  })
}

/**
 * マイリストグループの新規作成
 * @param  {String} request.userSession
 * @param  {String} request.name
 * @param  {String} request.description
 * @param  {Number} request.defaultSort
 * @param  {Number} request.isPublic
 */
export function createMyListGroup(request) {
  const defaultRequest = {
    description: '',
    defaultSort: 0, // 登録が古い順
    isPublic: 0,
  }

  request = Object.assign({}, defaultRequest, request)

  return Utils.fetch({
    url: baseURL.nicoapi.myListGroupAdd,
    request: {
      method: 'POST',
      headers: {
        'X-NICOVITA-SESSION': request.userSession,
      },
      body: {
        __format: 'json',
        default_sort: request.defaultSort,
        description: request.description,
        name: request.name,
        public: request.isPublic,
      },
    },
    responseType: 'json',
  })
}

/**
 * マイリストにアイテムを追加
 * @param {String} request.userSession
 * @param {String} request.watchId
 * @param {Number} request.groupId
 */
export function addItemMyList(request) {
  return Utils.fetch({
    url: baseURL.nicoapi.myListAdd,
    request: {
      method: 'POST',
      headers: {
        'X-NICOVITA-SESSION': request.userSession,
      },
      body: {
        __format: 'json',
        v: request.watchId,
        group_id: request.groupId,
      },
    },
    responseType: 'json',
  })
}

export function fetchUserId() {
  const url = 'https://public.api.nicovideo.jp/v1/user/id.json'

  return Utils.fetch({
    url,
    request: {
      credentials: 'include',
    },
    responseType: 'json',
  }).then((res) => res?.data?.userId)
}
