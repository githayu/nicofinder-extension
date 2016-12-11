import { Utils } from '../utils';

/**
 * WatchAPIを取得する
 * @param {Object}  request
 * @param {String}  request.watchId
 * @param {String}  request.playlistToken
 * @param {Boolean} request.isEconomy
 */
export async function fetchWatchAPI(request) {
  const eco = request.isEconomy ? 1 : 0;

  return await Utils.fetch({
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

  const watchHTML = await Utils.fetch({
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
  const response = await Utils.xhr({
    url: url,
    qs: { sb: 1 },
    withCredentials: true,
    responseType: 'xml',
    headers: {
      'Content-Type': 'application/xml'
    }
  });

  const storyboardResult = Utils.xmlChildrenParser(response.children);

  if (storyboardResult.smile.status === 'ok') {
    return storyboardResult.smile;
  }
}

/**
 * FlvInfoを取得する
 * @param {Object} params
 */
export async function fetchFlvInfo(params) {
  const paramsString = await Utils.fetch({
    url: 'http://flapi.nicovideo.jp/api/getflv',
    qs: params,
    request: { credentials: 'include' },
    responseType: 'text'
  });

  return Utils.decodeURLParams(paramsString);
}


/**
 * 同期通信で再生終了時間を記録する
 * @param {String} watchId
 * @param {String} playbackPosition
 * @param {Srting} CSRFToken
 */
export async function recoadPlaybackPosition(watchId, playbackPosition, CSRFToken) {
  return await Utils.xhr({
    url: 'http://flapi.nicovideo.jp/api/record_current_playback_position',
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
