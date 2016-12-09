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
    },
    responseType: 'json'
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
    qs: {
      watch_harmful: 1,
      eco: eco
    },
    request: { credentials: 'include' },
    responseType: 'text'
  });

  return new DOMParser().parseFromString(watchHTML, 'text/html');
}

/**
 * Storyboardを取得する
 * @param {string} url
 */
export async function fetchStoryboard(url) {
  const responseText = await Utils.fetch({
    url: url,
    qs: { sb: 1 },
    request: { credentials: 'include' },
    responseType: 'text'
  });

  const storyboardDocument = new DOMParser().parseFromString(responseText, 'application/xml');
  const storyboardResult = Utils.xmlChildrenParser(storyboardDocument.children);

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
