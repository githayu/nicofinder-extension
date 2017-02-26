import getIn from 'lodash.get';
import setIn from 'lodash.set';
import Cookies from 'js-cookie';
import { Utils, DetailURL } from '../utils';
import { LocalStorage } from '../nicofinder/';
import { API, DMCGateway, PostChat } from '../niconico/';

class Watch {
  constructor() {
    this.webAPI = {
      videoInfo: null,
      watchInfo: null
    };

    this.nicoAPI = {
      flvInfo: null,
      watchInfo: null,
      isHTML5: false
    };

    this.storage = new LocalStorage();

    chrome.runtime.onMessage.addListener(this.onMessageChrome.bind(this));

    chrome.runtime.sendMessage({
      type: 'isHTML5NicoVideo'
    }, (response) => this.nicoAPI.isHTML5 = response);

    const videoInfo = document.querySelector('.watch-api');
    const watchInfo = document.querySelector('.watch-data');

    if (!videoInfo || !watchInfo) return false;

    this.webAPI.videoInfo = JSON.parse(videoInfo.innerHTML);
    this.webAPI.watchInfo = JSON.parse(watchInfo.innerHTML);

    if (this.webAPI.watchInfo.version.startsWith('2.')) {
      const player = document.getElementById('player');

      player.addEventListener('onSettingChange', this.onSettingChange.bind(this));
      player.addEventListener('onVideoChange', this.onVideoChange.bind(this));

      window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
    }
  }

  onMessageChrome(request, sender, sendResponse) {
    switch (request.type) {
      case 'fetchWatchInfo':
        this.fetchWatchInfo().then(response => sendResponse(response));
        break;

      case 'changeQuality':
        this.changeQuality(request.payload).then(response => sendResponse(response));
        break;

      case 'fetchNicoHistory':
        this.fetchNicoHistory().then(() => sendResponse());
        break;

      case 'postChat':
        this.postChat(request.payload).then(response => sendResponse(response));
        break;

      case 'saveQueueToMyList':
        this.saveQueueToMyList(request.payload).then(response => sendResponse(response));
        break;
    }

    return true;
  }

  onBeforeUnload() {
    if (getIn(this, 'storage.player_setting_v2.use_resume')) {
      const video = document.getElementById('html5-video');
      const isEnd = Math.floor(video.duration) <= Math.floor(video.currentTime);
      const isPremium = this.nicoAPI.flvInfo.is_premium === 1;
      const isShort = video.currentTime < 60;

      if (video && isPremium && !isEnd && !isShort) {
        API.recoadPlaybackPosition(this.getWatchId, video.currentTime, this.getCSRFToken);
      }
    }
  }

  async fetchWatchEmbeddedAPI(isEconomy) {
    const watchDocument = await API.fetchWatchHTML({
      watchId: this.getWatchId,
      isEconomy: isEconomy
    });

    if (this.nicoAPI.isHTML5) {
      const embeddedAPI = watchDocument.getElementById('js-initial-watch-data');

      this.nicoAPI.watchInfo = JSON.parse(embeddedAPI.dataset.apiData);
      this.nicoAPI.watchEnv = JSON.parse(embeddedAPI.dataset.environment);
    } else {
      const embeddedAPI = watchDocument.getElementById('watchAPIDataContainer');

      this.nicoAPI.watchInfo = JSON.parse(embeddedAPI.innerText);
    }
  }

  async fetchWatchInfo() {
    this.nicoAPI.flvInfo = await API.fetchFlvInfo({
      v: this.getWatchId,
      eco: this.isForceEconomy
    });

    if (getIn(this, 'nicoAPI.flvInfo.closed')) {
      return Promise.resolve({
        flvInfo: this.nicoAPI.flvInfo
      });

    } else {
      await this.fetchWatchEmbeddedAPI();

      let result = {
        flvInfo: this.nicoAPI.flvInfo
      };

      if (this.dmcGateway) {
        await this.dmcGateway.deleteSession();
      }

      // Dmc
      if (this.getDmcInfo) {
        this.dmcGateway = new DMCGateway(this.getDmcInfo.session_api);
        const session = await this.dmcGateway.startSession();

        result = Object.assign({}, result, {
          dmcInfo: this.getDmcInfo.session_api,
          dmcSession: session
        });
      } else {
        this.dmcGateway = null;
      }

      // Resume
      if (this.nicoAPI.isHTML5 && this.nicoAPI.watchInfo.context.initialPlaybackType === 'resume') {
        result.resume = {
          playbackPosition: this.nicoAPI.watchInfo.context.initialPlaybackPosition
        };
      }

      // Storyboard
      if (this.nicoAPI.flvInfo.is_premium) {
        const storyboard = await API.fetchStoryboard(this.getVideoSource).catch(err => {

        });

        if (storyboard) {
          result.storyboard = storyboard;
        }
      }

      return Promise.resolve(result);
    }
  }

  onSettingChange() {
    this.storage.update('player_setting_v2');
  }

  onVideoChange(e) {
    const watchInfo = e.detail;

    if (!watchInfo) return;

    setIn(this, 'webAPI.videoInfo', e.detail);
  }

  async postChat(req) {
    const lastPostChat = this.storage.comment_history
      ? this.storage.comment_history[this.storage.comment_history.length - 1]
      : null;

    let request = {
      threadId: this.nicoAPI.flvInfo.thread_id,
      serverUrl: this.nicoAPI.flvInfo.ms,
      command: new Set(req.command.split(' ')),
      comment: req.comment,
      vpos: req.vpos,
      isAnonymity: req.isAnonymity,
      isPremium: this.nicoAPI.flvInfo.is_premium,
      isNeedsKey: Boolean(this.nicoAPI.flvInfo.needs_key),
      isAllowContinuousPosts: this.storage.player_setting_v2.allow_continuous_posts,
      userId: this.nicoAPI.flvInfo.user_id,
      lastPostChat: lastPostChat
    };

    if (this.nicoAPI.isHTML5) {
      request = Object.assign({}, request, {
        userKey: this.nicoAPI.watchInfo.context.userkey
      });
    }

    const response = await new PostChat(request);

    this.storage.push('comment_history', {
      thread: response.chat.thread,
      no: response.chat.no,
      vpos: response.chat.vpos,
      mail: response.chat.mail,
      user_id: this.nicoAPI.flvInfo.user_id,
      body: response.chat.content,
      date: response.chat.date
    });

    return Promise.resolve(response);
  }

  async fetchNicoHistory() {
    await API.fetchWatchAPI({
      watchId: this.getWatchId,
      playlistToken: this.getPlaylistToken
    });

    return Promise.resolve(true);
  }

  async changeQuality(request) {
    let result = {};

    switch (request.type) {
      case 'smile':
      case 'smile-economy': {
        const isEconomy = request.type === 'smile-economy';

        if (this.dmcGateway !== null) {
          await this.dmcGateway.deleteSession();
          this.dmcGateway = null;
        }

        this.nicoAPI.watchInfo = await API.fetchWatchAPI({
          watchId: this.getWatchId,
          playlistToken: this.getPlaylistToken,
          isEconomy: isEconomy
        });

        result = Object.assign({}, result, {
          type: 'smile',
          payload: {
            source: this.getVideoSource
          }
        });

        break;
      }

      default: {
        let session;

        if (this.dmcGateway) {
          await this.dmcGateway.deleteSession();
        }

        this.nicoAPI.watchInfo = await API.fetchWatchAPI({
          watchId: this.getWatchId,
          playlistToken: this.getPlaylistToken
        });

        this.dmcGateway = new DMCGateway(this.getDmcInfo.session_api);
        session = await this.dmcGateway.startSession(request.payload);

        result = Object.assign({}, result, {
          type: 'dmc',
          payload: {
            dmcSession: session
          }
        });
      }
    }

    return Promise.resolve(result);
  }

  async saveQueueToMyList(request) {
    const { group, items } = request;

    const userSession = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'getUserSession'
      }, (response) => resolve(response));
    });

    if (!userSession) return Promise.reject();

    const myListGroupResponse = await API.createMyListGroup({
      userSession: userSession,
      name: group.name,
      description: group.description,
      isPublic: group.isPublic ? 1 : 0
    }).then(res => res.nicovideo_mylistgroup_response).catch(err => {
      console.error(err);
    });

    if (myListGroupResponse['@status'] !== 'ok') {
      return Promise.reject();
    }

    const player = document.getElementById('player');
    const itemIterator = items.entries();

    // マイリストの登録順の最小が1秒毎なので1秒毎追加
    await new Promise(resolve => {
      const intervalId = setInterval(async () => {
        const item = itemIterator.next();

        if (item.done) {
          clearInterval(intervalId);
          return resolve();
        }

        const [itemIndex, itemDetail] = item.value;
        let itemStatus = true;

        const myListResponse = await API.addItemMyList({
          userSession: userSession,
          watchId: itemDetail.id,
          groupId: myListGroupResponse.id
        }).then(res => res.nicovideo_mylist_response).catch(err => {
          itemStatus = false;
        });

        if (myListResponse['@status'] !== 'ok') {
          itemStatus = false;
        }

        player.dispatchEvent(new CustomEvent('saveQueueToMyListProgress', {
          detail: {
            item: itemDetail,
            status: itemStatus,
            value: itemIndex + 1,
            max: items.length
          }
        }));
      }, 1000);
    });

    return Promise.resolve({
      groupId: myListGroupResponse.id
    });
  }

  get isForceEconomy() {
    return this.webAPI.videoInfo.video.movie_type === 'flv' ? 1 : 0;
  }

  get getWatchId() {
    return this.webAPI.videoInfo.video.channel
         ? this.webAPI.videoInfo.video.channel_thread
         : this.webAPI.videoInfo.video.id;
  }

  get getVideoSource() {
    if (getIn(this, 'nicoAPI.watchInfo.video.smileInfo.url')) {
      return this.nicoAPI.watchInfo.video.smileInfo.url;
    } else if (getIn(this, 'nicoAPI.watchInfo.flvInfo.url')) {
      return this.nicoAPI.watchInfo.flvInfo.url;
    } else {
      return null;
    }
  }

  get getDmcInfo() {
    if (getIn(this, 'nicoAPI.watchInfo.video.dmcInfo')) {
      return this.nicoAPI.watchInfo.video.dmcInfo;
    } else if (getIn(this, 'nicoAPI.watchInfo.flashvars.dmcInfo')) {
      return JSON.parse(decodeURIComponent(this.nicoAPI.watchInfo.flashvars.dmcInfo));
    } else {
      return null;
    }
  }

  get getPlaylistToken() {
    if (getIn(this, 'nicoAPI.watchEnv.playlistToken')) {
      return this.nicoAPI.watchEnv.playlistToken;
    } else if (getIn(this, 'nicoAPI.watchInfo.playlistToken')) {
      return this.nicoAPI.watchInfo.playlistToken;
    } else {
      return null;
    }
  }

  get getCSRFToken() {
    if (getIn(this, 'nicoAPI.watchInfo.context.csrfToken')) {
      return this.nicoAPI.watchInfo.context.csrfToken;
    } else if (getIn(this, 'nicoAPI.watchInfo.flashvars.csrfToken')) {
      return this.nicoAPI.watchInfo.flashvars.csrfToken;
    } else {
      return null;
    }
  }
};

new Watch();
