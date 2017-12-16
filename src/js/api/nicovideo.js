import { fetchClient, XHR, XMLToJS, decodeURLParams } from '../utils/';
import { baseURL } from '../constants';

/**
 * WatchAPIを取得する
 * @param {Object}  request
 * @param {String}  request.watchId
 * @param {String}  request.playlistToken
 * @param {Boolean} request.isEconomy
 */
export async function fetchWatchAPI(request) {
  const eco = request.isEconomy ? 1 : 0;

  return await fetchClient({
    url: `http://www.nicovideo.jp/watch/${request.watchId}`,
    responseType: 'json',
    qs: {
      mode: 'pc_html5',
      eco: eco,
      playlist_token: request.playlistToken,
      watch_harmful: 2,
      continue_watching: 1
    },
    request: {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  });
}

/**
 * WatchHTMLを取得する
 * @param {Object}  request
 * @param {String}  request.watchId
 * @param {Boolean} request.isEconomy
 */
export async function fetchWatchHTML(request) {
  const eco = request.isEconomy ? 1 : 0;

  const watchHTML = await fetchClient({
    url: `http://www.nicovideo.jp/watch/${request.watchId}`,
    request: { credentials: 'include' },
    responseType: 'text',
    qs: {
      watch_harmful: 1,
      eco: eco
    }
  });

  return new DOMParser().parseFromString(watchHTML, 'text/html');
}

/**
 * Storyboardを取得する
 * @param {string} url
 */
export async function fetchStoryboard(url) {
  const response = await XHR({
    url: url,
    qs: { sb: 1 },
    withCredentials: true,
    responseType: 'xml',
    headers: {
      'Content-Type': 'application/xml'
    }
  });

  const storyboardResult = XMLToJS(response.children);

  if (storyboardResult.smile.status === 'ok') {
    return storyboardResult.smile;
  }
}

/**
 * FlvInfoを取得する
 * @param {Object} options
 * @param {Object} options.qs
 * @param {boolean} options.decode
 */
export async function fetchFlvInfo(options) {
  const paramsString = await fetchClient({
    url: baseURL.nicoapi.getflv,
    qs: options.qs,
    request: { credentials: 'include' },
    responseType: 'text'
  });

  return options.decode
    ? decodeURLParams(paramsString)
    : paramsString;
}


/**
 * 同期通信で再生終了時間を記録する
 * @param {String} watchId
 * @param {String} playbackPosition
 * @param {Srting} CSRFToken
 */
export async function recoadPlaybackPosition(watchId, playbackPosition, CSRFToken) {
  return await XHR({
    url: baseURL.nicoapi.recoadPlaybackPosition,
    method: 'POST',
    async: false,
    responseType: 'json',
    withCredentials: true,
    body: {
      watch_id: watchId,
      playback_position: playbackPosition,
      csrf_token: CSRFToken
    }
  });
}

/**
 * 動画情報を取得する
 * @param  {String} videoId
 */
export function fetchVideoInfo(videoId) {
  return fetchClient({
    url: baseURL.nicoapi.videoInfo,
    request: {
      method: 'POST',
      body: {
        v: videoId,
        __format: 'json'
      }
    },
    responseType: 'json'
  });
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
    defaultSort: 0,  // 登録が古い順
    isPublic: 0
  };

  request = Object.assign({}, defaultRequest, request);

  return fetchClient({
    url: baseURL.nicoapi.myListGroupAdd,
    request: {
      method: 'POST',
      headers: {
        'X-NICOVITA-SESSION': request.userSession
      },
      body: {
        __format: 'json',
        default_sort: request.defaultSort,
        description: request.description,
        name: request.name,
        public: request.isPublic
      }
    },
    responseType: 'json'
  })
}

/**
 * マイリストにアイテムを追加
 * @param {String} request.userSession
 * @param {String} request.watchId
 * @param {Number} request.groupId
 */
export function addItemMyList(request) {
  return fetchClient({
    url: baseURL.nicoapi.myListAdd,
    request: {
      method: 'POST',
      headers: {
        'X-NICOVITA-SESSION': request.userSession
      },
      body: {
        __format: 'json',
        v: request.watchId,
        group_id: request.groupId
      }
    },
    responseType: 'json'
  });
}
