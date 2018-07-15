// @flow

import { Utils } from 'js/utils'
import { baseURL } from 'js/config'
import { isNil } from 'lodash'

/**
 * WatchAPIを取得する
 */
export async function fetchWatchAPI(
  {
    watchId,
    playlistToken,
    isEconomy,
  }: {
    watchId: string,
    playlistToken: string,
    isEconomy: boolean,
  },
  viaBackground: boolean = false
) {
  const eco = isEconomy ? 1 : 0

  return await Utils.fetch({
    viaBackground,
    request: {
      url: `http://www.nicovideo.jp/watch/${watchId}`,
      responseType: 'json',
      qs: {
        mode: 'pc_html5',
        eco: eco,
        playlist_token: playlistToken,
        watch_harmful: 2,
        continue_watching: 1,
      },
      request: {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    },
  })
}

/**
 * WatchHTMLを取得する
 */
export function fetchWatchHTML(
  {
    isEconomy,
    watchId,
  }: {
    isEconomy: boolean,
    watchId: string,
  },
  viaBackground: boolean = false
) {
  return Utils.fetch({
    viaBackground,
    request: {
      url: `http://www.nicovideo.jp/watch/${watchId}`,
      request: { credentials: 'include' },
      responseType: 'text',
      qs: {
        watch_harmful: 1,
        eco: isEconomy ? 1 : 0,
      },
    },
  })
    .then((watchHTML) =>
      new DOMParser().parseFromString(watchHTML, 'text/html')
    )
    .catch((err) => Promise.reject(err))
}

/**
 * Storyboardを取得する
 */
export async function fetchStoryboard(
  url: string,
  viaBackground: boolean = false
) {
  const response = await Utils.XHR({
    viaBackground,
    request: {
      url: url,
      qs: { sb: 1 },
      withCredentials: true,
      headers: {
        'Content-Type': 'application/xml',
      },
    },
  }).catch(() => false)

  if (!response) return null

  const parser = new DOMParser()
  const xml = parser.parseFromString(response, 'application/xml')
  const storyboardResult = Utils.xmlChildrenParser(xml.children)

  if (storyboardResult?.smile?.status === 'ok') {
    return storyboardResult.smile
  } else {
    return null
  }
}

/**
 * FlvInfoを取得する
 */
export async function fetchFlvInfo(
  params: {
    v: string,
    eco?: number,
    is_https?: number,
    [string]: string | number,
  },
  viaBackground: boolean = false
) {
  const paramsString = await Utils.fetch({
    viaBackground,
    request: {
      url: baseURL.nicoapi.getflv,
      qs: {
        ...params,
      },
      request: { credentials: 'include' },
      responseType: 'text',
    },
  })

  return Utils.decodeURLParams(paramsString)
}

/**
 * waybackkeyを取得する
 */
export function fetchWaybackkey(params: any, viaBackground: boolean = false) {
  return Utils.fetch({
    viaBackground,
    request: {
      url: baseURL.nicoapi.getWaybackkey,
      request: {
        method: 'POST',
        credentials: 'include',
        body: params,
      },
      responseType: 'text',
    },
  }).then((res) => Utils.decodeURLParams(res))
}

/**
 * 再生終了時間を記録する
 */
export function recoadPlaybackPosition(
  {
    watchId,
    playbackPosition,
    CSRFToken,
  }: {
    watchId: string,
    playbackPosition: number,
    CSRFToken: string,
  },
  viaBackground: boolean = false
): Promise<{
  user_id: number,
  watch_id: string,
  playback_position: number,
  status: string,
}> {
  return Utils.XHR({
    viaBackground,
    request: {
      url: baseURL.nicoapi.recoadPlaybackPosition,
      method: 'POST',
      responseType: 'json',
      withCredentials: true,
      body: {
        watch_id: watchId,
        playback_position: playbackPosition,
        csrf_token: CSRFToken,
      },
    },
  })
}

/**
 * 動画情報を取得する
 */
export function fetchVideoInfo(
  videoId: string,
  viaBackground: boolean = false
) {
  return Utils.fetch({
    viaBackground,
    request: {
      url: baseURL.nicoapi.videoInfo,
      request: {
        method: 'POST',
        body: {
          v: videoId,
          __format: 'json',
        },
      },
      responseType: 'json',
    },
  })
}

/**
 * マイリストグループの新規作成
 */
export function createMyListGroup(
  {
    userSession,
    name,
    description = '',
    defaultSort = 0,
    isPublic = 0,
  }: {
    userSession: string,
    name: string,
    description: string,
    defaultSort?: number,
    isPublic: number,
  },
  viaBackground: boolean = false
) {
  return Utils.fetch({
    viaBackground,
    request: {
      url: baseURL.nicoapi.myListGroupAdd,
      request: {
        method: 'POST',
        headers: {
          'X-NICOVITA-SESSION': userSession,
        },
        body: {
          __format: 'json',
          default_sort: defaultSort,
          description: description,
          name: name,
          public: isPublic,
        },
      },
      responseType: 'json',
    },
  })
}

/**
 * マイリストにアイテムを追加
 */
export function addItemMyList(
  {
    userSession,
    watchId,
    groupId,
    description,
  }: {
    userSession: string,
    watchId: string,
    description?: string,
    groupId: number,
  },
  viaBackground: boolean = false
) {
  const isDefList = groupId === 'defList'
  const body: {
    [string]: string | number,
  } = {
    __format: 'json',
    v: watchId,
  }

  if (!isDefList) body.group_id = groupId
  if (!isNil(description)) body.description = description

  return Utils.fetch({
    viaBackground,
    request: {
      url: isDefList ? baseURL.nicoapi.defListAdd : baseURL.nicoapi.myListAdd,
      request: {
        method: 'POST',
        headers: {
          'X-NICOVITA-SESSION': userSession,
        },
        body,
      },
      responseType: 'json',
    },
  })
}

/**
 * マイリストグループリストの取得
 */
export function fetchMyListGroupList(viaBackground: boolean = false) {
  return Utils.fetch({
    viaBackground,
    request: {
      url: baseURL.nicoapi.myListGroupList,
      request: {
        credentials: 'include',
      },
      responseType: 'json',
    },
  })
}

/**
 * マイリストアイテムの取得
 */
export function fetchMyListItems(
  {
    groupId,
  }: {
    groupId: string,
  },
  viaBackground: boolean = false
) {
  const isDefList = groupId === 'defList'

  return Utils.fetch({
    viaBackground,
    request: {
      url: isDefList
        ? baseURL.nicoapi.defListItemList
        : baseURL.nicoapi.myListItemList,
      request: {
        method: 'POST',
        credentials: 'include',
        ...(isDefList
          ? {}
          : {
              body: {
                group_id: groupId,
              },
            }),
      },
      responseType: 'json',
    },
  })
}

/**
 * ユーザーIDの取得
 *
 * @export
 * @returns
 */
export async function fetchUserId(viaBackground: boolean = false) {
  const res = await Utils.fetch({
    viaBackground,
    request: {
      url: baseURL.nicoapi.getUserId,
      request: {
        credentials: 'include',
      },
      responseType: 'json',
    },
  })

  return res?.data?.userId
}

/**
 * Threadkeyの取得
 */
export async function fetchThreadkey(
  threadId: string | number,
  viaBackground: boolean = false
): Promise<{ threadkey: string, force_184: number }> {
  const formData = new FormData()

  formData.append('thread', String(threadId))

  // Cookieも送らないと正確なキーがもらえない
  const response = await Utils.fetch({
    viaBackground,
    request: {
      url: baseURL.nicoapi.getThreadkey,
      request: {
        method: 'POST',
        body: formData,
        credentials: 'include',
      },
      responseType: 'text',
    },
  })

  const threadSecret = Utils.decodeURLParams(response)

  if (!threadSecret.threadkey.length) {
    throw new Error('Thread key is empty')
  }

  return threadSecret
}
