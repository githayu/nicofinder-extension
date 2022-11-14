import { API } from '.'

import { pick } from 'lodash-es'

export class NicoVideoAPI {
  constructor(public id: string) {}

  /**
   * 動画IDとスレッドIDの判別
   */
  static detectId(id: string) {
    if (/^\d+$/.test(id)) {
      return 'thread'
    }

    if (/^[a-z]{2}\d+$/i.test(id)) {
      return 'watch'
    }

    return null
  }

  /**
   * スレッドIDから視聴IDを取得する
   */
  async threadIdToWatchId(threadId: string) {
    const res = await API.fetchThumbInfo(threadId)

    const videoId = res.querySelector('video_id')?.textContent

    return videoId
  }

  /**
   * 動画視聴情報を取得する
   */
  async fetchWatchData(session: string) {
    const watchId =
      NicoVideoAPI.detectId(this.id) === 'thread'
        ? await this.threadIdToWatchId(this.id)
        : this.id

    if (!watchId) {
      throw new Error('Unknown ID')
    }

    const url = new URL(watchId, 'https://www.nicovideo.jp/api/watch/v3/')

    url.searchParams.append(
      'actionTrackId',
      `${Math.random().toString(32).substr(2)}_${Date.now()}`
    )
    url.searchParams.append('i18nLanguage', 'ja-jp')
    url.searchParams.append('isContinueWatching', 'true')
    url.searchParams.append('skips', 'adult,harmful')
    url.searchParams.append('withoutHistory', 'true')

    const watchData = await fetch(url, {
      headers: {
        cookie: `user_session=${session}`,
        'X-Frontend-Id': '2',
        'X-Frontend-Version': '0',
      },
    }).then((res) => res.json())

    return watchData
  }

  /**
   * 動画情報の更新と取得
   */
  async fetchNicofinderWatchData(watchData: any) {
    const res = await fetch(
      `https://asia-northeast1-nicofinder-io.cloudfunctions.net/api/watch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            id: watchData.video.id,
            additionals: ['video', 'threads', 'user', 'channel'],
            watchData: pick(watchData, [
              'comment',
              'video',
              'channel',
              'owner',
            ]),
          },
        }),
      }
    ).then((res) => res.json())

    return res
  }

  async run(session: string) {
    const watchData = await this.fetchWatchData(session)

    if (watchData?.meta?.status !== 200) {
      return watchData
    }

    const result = await this.fetchNicofinderWatchData(watchData.data)

    return {
      ...result,
      meta: { status: 200 },
    }
  }
}
