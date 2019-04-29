import { DMCGateway, PostChat, LocalStorage, API } from '../scripts'
import { has, get } from 'lodash-es'

type ExternalConnectEvent =
  | {
      type: 'fetchWatchInfo'
    }
  | {
      type: 'changeQuality'
      payload: any
    }
  | {
      type: 'fetchNicoHistory'
    }
  | { type: 'postChat'; payload: any }
  | { type: 'saveQueueToMyList'; payload: any }
  | {
      type: 'closeStoryboardSession'
    }

type ChangeQualityRequest =
  | {
      type: 'smile'
    }
  | { type: 'smile-economy' }
  | {
      type: 'dmc'
      payload: any
    }

class Watch {
  session?: DMCGateway
  storyboardSession?: DMCGateway
  watchInfo?: nicovideo.WatchInfo
  watchEnv?: nicovideo.WatchEnv
  pageData?: any
  pageWatchInfo?: any
  storage = new LocalStorage()

  constructor() {
    // 外部リクエストの処理
    window.chrome.runtime.onConnect.addListener((port) => {
      port.onMessage.addListener(this.onConnectChrome)
    })

    const pageData = document.querySelector('.watch-data')
    const pageWatchInfo = document.querySelector('.watch-api')

    if (!pageData || !pageWatchInfo) return

    this.pageData = JSON.parse(pageData.innerHTML)
    this.pageWatchInfo = JSON.parse(pageWatchInfo.innerHTML)

    if (this.pageData && this.pageData.version.startsWith('2.')) {
      const player = document.getElementById('player')

      if (!player) return

      player.addEventListener('onSettingChange', () =>
        this.storage.update('player_setting_v2')
      )

      player.addEventListener('onVideoChange', ({ detail }: CustomEvent) => {
        if (!detail) return

        this.pageWatchInfo = detail
      })

      window.addEventListener('beforeunload', this.onBeforeUnload.bind(this))
    }
  }

  onConnectChrome = (msg: ExternalConnectEvent, port: chrome.runtime.Port) => {
    switch (msg.type) {
      case 'fetchWatchInfo':
        this.fetchWatchInfo(port)
        break

      case 'changeQuality':
        this.changeQuality(port, msg.payload)
        break

      case 'fetchNicoHistory':
        this.fetchNicoHistory(port)
        break

      case 'postChat':
        this.postChat(port, msg.payload)
        break

      case 'saveQueueToMyList':
        this.saveQueueToMyList(port, msg.payload)
        break

      case 'closeStoryboardSession':
        if (this.storyboardSession) {
          this.storyboardSession.deleteSession()
        }
        break
    }
  }

  onBeforeUnload() {
    if (this.session) {
      this.session.deleteSession()
    }

    if (this.storyboardSession) {
      this.storyboardSession.deleteSession()
    }

    if (this.storage.player_setting_v2.use_resume) {
      const video = document.getElementById('html5-video')

      if (!(video instanceof HTMLVideoElement)) return

      const isEnd = Math.floor(video.duration) <= Math.floor(video.currentTime)
      const isPremium = this.watchInfo && this.watchInfo.viewer.isPremium
      const isShort = video.currentTime < 60

      if (video && isPremium && !isEnd && !isShort) {
        if (!this.getWatchId || !this.getCSRFToken) return

        API.recoadPlaybackPosition(
          {
            watchId: this.getWatchId,
            playbackPosition: video.currentTime,
            CSRFToken: this.getCSRFToken,
          },
          true
        )
      }
    }
  }

  async fetchWatchEmbeddedAPI(isEconomy: boolean = false) {
    if (!this.getWatchId) {
      return Promise.reject(new Error('No watchId'))
    }

    const watchDocument = await API.fetchWatchHTML(
      {
        watchId: this.getWatchId,
        isEconomy: isEconomy,
      },
      true
    ).catch((err) => Promise.reject(err))

    const embeddedAPI = watchDocument.getElementById('js-initial-watch-data')

    if (
      !embeddedAPI ||
      !embeddedAPI.dataset ||
      !embeddedAPI.dataset.apiData ||
      !embeddedAPI.dataset.environment
    ) {
      return Promise.reject(new Error('no embeddedAPI'))
    }

    const watchInfo: nicovideo.WatchInfo = JSON.parse(
      embeddedAPI.dataset.apiData
    )
    const watchEnv: nicovideo.WatchEnv = JSON.parse(
      embeddedAPI.dataset.environment
    )

    return {
      watchInfo,
      watchEnv,
    }
  }

  async fetchWatchInfo(port: chrome.runtime.Port) {
    const { watchInfo, watchEnv } = await this.fetchWatchEmbeddedAPI().catch(
      (err) => {
        port.postMessage({
          type: 'watch-info',
          error: true,
          message: err.message,
        })

        return {
          watchInfo: undefined,
          watchEnv: undefined,
        }
      }
    )

    this.watchInfo = watchInfo
    this.watchEnv = watchEnv

    const data: any = {
      watchInfo: {
        type: 'watch-info',
        payload: watchInfo,
      },
      dmcSession: {
        type: 'dmc-session',
        payload: null,
      },
      storyboardInfo: {
        type: 'storyboard-info',
        payload: null,
      },
    }

    port.postMessage(data.watchInfo)

    if (this.session) {
      await this.session.deleteSession()
    }

    // Session
    if (this.getDmcInfo) {
      this.session = new DMCGateway(this.getDmcInfo.session_api)

      const session = await this.session.startSession()

      data.dmcSession.payload = session
    } else {
      this.session = undefined
    }

    port.postMessage(data.dmcSession)

    // Storyboard Session
    if (this.getDmcInfo && this.getDmcInfo.storyboard_session_api) {
      const storyboardSession = new DMCGateway(
        this.getDmcInfo.storyboard_session_api
      )

      await storyboardSession.startSession()

      data.storyboardInfo.payload = storyboardSession.storyboard

      this.storyboardSession = storyboardSession

      port.postMessage(data.storyboardInfo)
    } else {
      this.storyboardSession = undefined
    }

    // Storyboard
    if (
      !data.storyboardInfo.payload &&
      watchInfo &&
      watchInfo.viewer.isPremium &&
      this.getVideoSource
    ) {
      const storyboard = await API.fetchStoryboard(this.getVideoSource)

      if (storyboard) {
        data.storyboardInfo.payload = storyboard
      }

      port.postMessage(data.storyboardInfo)
    }
  }

  async postChat(
    port: chrome.runtime.Port,
    req: {
      command: string
      comment: string
      vpos: number
      isAnonymity: boolean
    }
  ) {
    const { watchInfo } = this

    if (!watchInfo) {
      return Promise.reject(new Error('No watchInfo'))
    }

    const lastPostChat = this.storage.comment_history
      ? this.storage.comment_history[this.storage.comment_history.length - 1]
      : null

    const mainThread = watchInfo.commentComposite.threads.find(
      (i) => i.isDefaultPostTarget
    )

    if (!mainThread) {
      return Promise.reject(new Error('No mainThread'))
    }

    let request = {
      threadId: String(mainThread.id),
      serverUrl: watchInfo.thread.serverUrl,
      command: new Set(req.command.split(' ')),
      comment: req.comment,
      vpos: req.vpos,
      isAnonymity: req.isAnonymity,
      isPremium: watchInfo.viewer.isPremium,
      isNeedsKey: mainThread.isThreadkeyRequired,
      isAllowContinuousPosts: this.storage.player_setting_v2
        .allow_continuous_posts,
      userId: watchInfo.viewer.id,
      lastPostChat: lastPostChat,
      userKey: watchInfo.context.userkey,
    }

    const response = await new PostChat(request).execute()

    if (!response) {
      return
    }

    this.storage.push('comment_history', {
      thread: response.chat.thread,
      no: response.chat.no,
      vpos: response.chat.vpos,
      mail: response.chat.mail,
      user_id: watchInfo.viewer.id,
      body: response.chat.content,
      date: response.chat.date,
    })

    port.postMessage({
      type: 'completedCommentPost',
      payload: response,
    })
  }

  async fetchNicoHistory(port: chrome.runtime.Port) {
    if (!this.getWatchId || !this.getPlaylistToken) {
      return Promise.reject(new Error('No authData'))
    }

    await API.fetchWatchAPI({
      watchId: this.getWatchId,
      playlistToken: this.getPlaylistToken,
      isEconomy: false,
    })

    port.postMessage({
      type: 'fetch-nicoHistory',
    })
  }

  async changeQuality(
    port: chrome.runtime.Port,
    request: ChangeQualityRequest
  ) {
    let result = {}

    if (!this.getWatchId || !this.getPlaylistToken) {
      return Promise.reject(new Error('No authData'))
    }

    switch (request.type) {
      case 'smile':
      case 'smile-economy': {
        const isEconomy = request.type === 'smile-economy'

        if (this.session) {
          await this.session.deleteSession()
          this.session = undefined
        }

        this.watchInfo = await API.fetchWatchAPI(
          {
            watchId: this.getWatchId,
            playlistToken: this.getPlaylistToken,
            isEconomy: isEconomy,
          },
          true
        )

        result = Object.assign({}, result, {
          type: 'smile',
          payload: {
            source: this.getVideoSource,
          },
        })

        break
      }

      default: {
        let session

        if (this.session) {
          await this.session.deleteSession()
        }

        this.watchInfo = await API.fetchWatchAPI(
          {
            watchId: this.getWatchId,
            playlistToken: this.getPlaylistToken,
            isEconomy: false,
          },
          true
        )

        if (this.getDmcInfo) {
          this.session = new DMCGateway(this.getDmcInfo.session_api)
          session = await this.session.startSession(request.payload)

          result = Object.assign({}, result, {
            type: 'dmc',
            payload: {
              dmcSession: session,
            },
          })
        }
      }
    }

    port.postMessage({
      type: 'change-quality',
      payload: result,
    })
  }

  async saveQueueToMyList(
    port: chrome.runtime.Port,
    request: {
      group: {
        name: string
        description: string
        isPublic: boolean
      }
      items: any
    }
  ) {
    const { group, items } = request

    const userSession: string = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'getUserSession',
        },
        (response) => resolve(response)
      )
    })

    if (!userSession) {
      return Promise.reject(new Error('No userSession'))
    }

    const myListGroupResponse = await API.createMyListGroup(
      {
        userSession: userSession,
        name: group.name,
        description: group.description,
        isPublic: group.isPublic ? 1 : 0,
      },
      true
    )
      .then((res) => res.nicovideo_mylistgroup_response)
      .catch((err) => Promise.reject(err))

    if (get(myListGroupResponse, '@status') !== 'ok') {
      return Promise.reject()
    }

    const itemIterator = items.entries()

    // マイリストの登録順の最小が1秒毎なので1秒毎追加
    await new Promise((resolve) => {
      const intervalId = setInterval(async () => {
        const item = itemIterator.next()

        if (item.done) {
          clearInterval(intervalId)
          return resolve()
        }

        const [itemIndex, itemDetail] = item.value
        let itemStatus = true

        const myListResponse = await API.addItemMyList(
          {
            userSession: userSession,
            watchId: itemDetail.id,
            groupId: myListGroupResponse.id,
          },
          true
        )
          .then((res) => res.nicovideo_mylist_response)
          .catch(() => {
            itemStatus = false
          })

        if (get(myListResponse, '@status') !== 'ok') {
          itemStatus = false
        }

        port.postMessage({
          type: 'progressSaveQueueToMyList',
          payload: {
            item: itemDetail,
            status: itemStatus,
            value: itemIndex + 1,
            max: items.length,
          },
        })
      }, 1000)
    })

    port.postMessage({
      type: 'completeSaveQueueToMyList',
      payload: {
        groupId: myListGroupResponse.id,
      },
    })
  }

  get isForceEconomy() {
    const { watchInfo } = this

    return watchInfo && watchInfo.video.movieType === 'flv' ? 1 : 0
  }

  get getWatchId() {
    const { pageWatchInfo } = this

    return pageWatchInfo && pageWatchInfo.video.channel
      ? pageWatchInfo.video.channel_thread
      : pageWatchInfo.video.id
  }

  get getVideoSource() {
    const { watchInfo } = this

    if (watchInfo && has(watchInfo, 'video.smileInfo.url')) {
      return watchInfo.video.smileInfo.url
    } else {
      return null
    }
  }

  get getDmcInfo() {
    const { watchInfo } = this

    if (watchInfo && watchInfo.video.dmcInfo) {
      return watchInfo.video.dmcInfo
    } else {
      return null
    }
  }

  get getPlaylistToken() {
    const { watchEnv } = this

    if (watchEnv && watchEnv.playlistToken) {
      return watchEnv.playlistToken
    } else {
      return null
    }
  }

  get getCSRFToken() {
    const { watchInfo } = this

    if (watchInfo && watchInfo.context.csrfToken) {
      return watchInfo.context.csrfToken
    } else {
      return null
    }
  }
}

new Watch()
