import _ from 'lodash'
import { Utils, DetailURL } from '../utils'
import { LocalStorage } from '../nicofinder/'
import { API, DMCGateway, PostChat } from '../niconico/'

class Watch {
  constructor() {
    this.webAPI = {
      videoInfo: null,
      watchInfo: null,
    }

    this.nicoAPI = {
      flvInfo: null,
      watchInfo: null,
      isFlash: false,
    }

    this.storage = new LocalStorage()

    // 外部リクエストの処理
    chrome.runtime.onConnect.addListener((port) => {
      port.onMessage.addListener(this.onConnectChrome.bind(this))
    })

    chrome.runtime.sendMessage(
      {
        type: 'isWatchFlash',
      },
      (response) => (this.nicoAPI.isFlash = response)
    )

    const videoInfo = document.querySelector('.watch-api')
    const watchInfo = document.querySelector('.watch-data')

    if (!videoInfo || !watchInfo) return false

    this.webAPI.videoInfo = JSON.parse(videoInfo.innerHTML)
    this.webAPI.watchInfo = JSON.parse(watchInfo.innerHTML)

    if (this.webAPI.watchInfo.version.startsWith('2.')) {
      const player = document.getElementById('player')

      player.addEventListener(
        'onSettingChange',
        this.onSettingChange.bind(this)
      )
      player.addEventListener('onVideoChange', this.onVideoChange.bind(this))

      window.addEventListener('beforeunload', this.onBeforeUnload.bind(this))
    }
  }

  onConnectChrome(msg, port) {
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
    }
  }

  onBeforeUnload() {
    if (_.get(this, 'storage.player_setting_v2.use_resume')) {
      const video = document.getElementById('html5-video')
      const isEnd = Math.floor(video.duration) <= Math.floor(video.currentTime)
      const isPremium = this.nicoAPI.flvInfo.is_premium === 1
      const isShort = video.currentTime < 60

      if (video && isPremium && !isEnd && !isShort) {
        API.recoadPlaybackPosition(
          this.getWatchId,
          video.currentTime,
          this.getCSRFToken
        )
      }
    }
  }

  async fetchWatchEmbeddedAPI(isEconomy) {
    const watchDocument = await API.fetchWatchHTML({
      watchId: this.getWatchId,
      isEconomy: isEconomy,
    })

    if (!this.nicoAPI.isFlash) {
      const embeddedAPI = watchDocument.getElementById('js-initial-watch-data')

      this.nicoAPI.watchInfo = JSON.parse(embeddedAPI.dataset.apiData)
      this.nicoAPI.watchEnv = JSON.parse(embeddedAPI.dataset.environment)
    } else {
      const embeddedAPI = watchDocument.getElementById('watchAPIDataContainer')

      this.nicoAPI.watchInfo = JSON.parse(embeddedAPI.innerText)
    }
  }

  async fetchWatchInfo(port) {
    this.nicoAPI.flvInfo = await API.fetchFlvInfo({
      v: this.getWatchId,
      eco: this.isForceEconomy,
    })

    const data = {
      flvInfo: {
        type: 'flvInfo',
        payload: this.nicoAPI.flvInfo,
      },
      dmcInfo: {
        type: 'dmcInfo',
        payload: null,
      },
      resumeInfo: {
        type: 'resumeInfo',
        payload: null,
      },
      storyboardInfo: {
        type: 'storyboardInfo',
        payload: null,
      },
    }

    if (_.get(this, 'nicoAPI.flvInfo.closed')) {
      Object.values(data).forEach((item) => {
        port.postMessage(item)
      })
    } else {
      await this.fetchWatchEmbeddedAPI()

      port.postMessage(data.flvInfo)

      if (this.dmcGateway) {
        await this.dmcGateway.deleteSession()
      }

      // Dmc
      if (this.getDmcInfo) {
        this.dmcGateway = new DMCGateway(this.getDmcInfo.session_api)
        const session = await this.dmcGateway.startSession()

        data.dmcInfo.payload = {
          dmcInfo: this.getDmcInfo.session_api,
          dmcSession: session,
        }
      } else {
        this.dmcGateway = null
      }

      port.postMessage(data.dmcInfo)

      // Resume
      if (
        !this.nicoAPI.isFlash &&
        this.nicoAPI.watchInfo.context.initialPlaybackType === 'resume'
      ) {
        data.resumeInfo.payload = {
          playbackPosition: this.nicoAPI.watchInfo.context
            .initialPlaybackPosition,
        }
      }

      port.postMessage(data.resumeInfo)

      // Storyboard
      if (this.nicoAPI.flvInfo.is_premium) {
        const storyboard = await API.fetchStoryboard(this.getVideoSource).catch(
          (err) => {}
        )

        if (storyboard) {
          data.storyboardInfo.payload = storyboard
        }
      }

      port.postMessage(data.storyboardInfo)
    }
  }

  onSettingChange() {
    this.storage.update('player_setting_v2')
  }

  onVideoChange(e) {
    const watchInfo = e.detail

    if (!watchInfo) return

    _.set(this, 'webAPI.videoInfo', e.detail)
  }

  async postChat(port, req) {
    const lastPostChat = this.storage.comment_history
      ? this.storage.comment_history[this.storage.comment_history.length - 1]
      : null

    let request = {
      threadId: this.nicoAPI.flvInfo.thread_id,
      serverUrl: this.nicoAPI.flvInfo.ms,
      command: new Set(req.command.split(' ')),
      comment: req.comment,
      vpos: req.vpos,
      isAnonymity: req.isAnonymity,
      isPremium: this.nicoAPI.flvInfo.is_premium,
      isNeedsKey: Boolean(this.nicoAPI.flvInfo.needs_key),
      isAllowContinuousPosts: this.storage.player_setting_v2
        .allow_continuous_posts,
      userId: this.nicoAPI.flvInfo.user_id,
      lastPostChat: lastPostChat,
    }

    if (!this.nicoAPI.isFlash) {
      request = Object.assign({}, request, {
        userKey: this.nicoAPI.watchInfo.context.userkey,
      })
    }

    const response = await new PostChat(request)

    this.storage.push('comment_history', {
      thread: response.chat.thread,
      no: response.chat.no,
      vpos: response.chat.vpos,
      mail: response.chat.mail,
      user_id: this.nicoAPI.flvInfo.user_id,
      body: response.chat.content,
      date: response.chat.date,
    })

    port.postMessage({
      type: 'completedCommentPost',
      payload: response,
    })
  }

  async fetchNicoHistory(port) {
    await API.fetchWatchAPI({
      watchId: this.getWatchId,
      playlistToken: this.getPlaylistToken,
    })

    port.postMessage({
      type: 'fetchNicoHistory',
    })
  }

  async changeQuality(port, request) {
    let result = {}

    switch (request.type) {
      case 'smile':
      case 'smile-economy': {
        const isEconomy = request.type === 'smile-economy'

        if (this.dmcGateway !== null) {
          await this.dmcGateway.deleteSession()
          this.dmcGateway = null
        }

        this.nicoAPI.watchInfo = await API.fetchWatchAPI({
          watchId: this.getWatchId,
          playlistToken: this.getPlaylistToken,
          isEconomy: isEconomy,
        })

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

        if (this.dmcGateway) {
          await this.dmcGateway.deleteSession()
        }

        this.nicoAPI.watchInfo = await API.fetchWatchAPI({
          watchId: this.getWatchId,
          playlistToken: this.getPlaylistToken,
        })

        this.dmcGateway = new DMCGateway(this.getDmcInfo.session_api)
        session = await this.dmcGateway.startSession(request.payload)

        result = Object.assign({}, result, {
          type: 'dmc',
          payload: {
            dmcSession: session,
          },
        })
      }
    }

    port.postMessage({
      type: 'changeQuality',
      payload: result,
    })
  }

  async saveQueueToMyList(port, request) {
    const { group, items } = request

    const userSession = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'getUserSession',
        },
        (response) => resolve(response)
      )
    })

    if (!userSession) return Promise.reject()

    const myListGroupResponse = await API.createMyListGroup({
      userSession: userSession,
      name: group.name,
      description: group.description,
      isPublic: group.isPublic ? 1 : 0,
    })
      .then((res) => res.nicovideo_mylistgroup_response)
      .catch((err) => {
        console.error(err)
      })

    if (myListGroupResponse['@status'] !== 'ok') {
      return Promise.reject()
    }

    const player = document.getElementById('player')
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

        const myListResponse = await API.addItemMyList({
          userSession: userSession,
          watchId: itemDetail.id,
          groupId: myListGroupResponse.id,
        })
          .then((res) => res.nicovideo_mylist_response)
          .catch((err) => {
            itemStatus = false
          })

        if (myListResponse['@status'] !== 'ok') {
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
    return this.webAPI.videoInfo.video.movie_type === 'flv' ? 1 : 0
  }

  get getWatchId() {
    return this.webAPI.videoInfo.video.channel
      ? this.webAPI.videoInfo.video.channel_thread
      : this.webAPI.videoInfo.video.id
  }

  get getVideoSource() {
    if (_.get(this, 'nicoAPI.watchInfo.video.smileInfo.url')) {
      return this.nicoAPI.watchInfo.video.smileInfo.url
    } else if (_.get(this, 'nicoAPI.watchInfo.flvInfo.url')) {
      return this.nicoAPI.watchInfo.flvInfo.url
    } else {
      return null
    }
  }

  get getDmcInfo() {
    if (_.get(this, 'nicoAPI.watchInfo.video.dmcInfo')) {
      return this.nicoAPI.watchInfo.video.dmcInfo
    } else if (_.get(this, 'nicoAPI.watchInfo.flashvars.dmcInfo')) {
      return JSON.parse(
        decodeURIComponent(this.nicoAPI.watchInfo.flashvars.dmcInfo)
      )
    } else {
      return null
    }
  }

  get getPlaylistToken() {
    if (_.get(this, 'nicoAPI.watchEnv.playlistToken')) {
      return this.nicoAPI.watchEnv.playlistToken
    } else if (_.get(this, 'nicoAPI.watchInfo.playlistToken')) {
      return this.nicoAPI.watchInfo.playlistToken
    } else {
      return null
    }
  }

  get getCSRFToken() {
    if (_.get(this, 'nicoAPI.watchInfo.context.csrfToken')) {
      return this.nicoAPI.watchInfo.context.csrfToken
    } else if (_.get(this, 'nicoAPI.watchInfo.flashvars.csrfToken')) {
      return this.nicoAPI.watchInfo.flashvars.csrfToken
    } else {
      return null
    }
  }
}

new Watch()
