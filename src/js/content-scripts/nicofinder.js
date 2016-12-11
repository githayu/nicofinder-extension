import getIn from 'lodash.get';
import setIn from 'lodash.set';
import Cookies from 'js-cookie';
import { Utils, DetailURL } from '../utils';
import CommentPost from '../niconico/post-chat';
import DMCGateway from '../niconico/dmc-gateway';
import NicofinderStorage from '../nicofinder/localstorage';
import {
  fetchWatchAPI,
  fetchWatchHTML,
  fetchStoryboard,
  fetchFlvInfo,
  recoadPlaybackPosition
} from '../niconico/api';

// 後方互換のために冗長なところは移行後に消す

class Nicofinder {
  web = {
    videoInfo: null,
    watchInfo: null
  };

  nicoApi = {
    flvInfo: null,
    watchInfo: null
  };

  player = null;
  video = null;
  receiver = null;
  storage = null;
  dmcGateway = null;

  constructor() {
    this.storage = new NicofinderStorage();

    document.addEventListener('DOMContentLoaded', this.domContentLoaded);

    chrome.runtime.sendMessage({
      type: 'isHTML5NicoVideo'
    }, (res) => this.isHTML5 = res);
  }

  beforeUnload = async () => {
    if (getIn(this, 'storage.player_setting_v2.use_resume')) {
      const video = document.getElementById('html5-video');
      const isPlay = Math.floor(video.currentTime) !== 0;
      const isNotEnd = Math.floor(video.duration) > Math.floor(video.currentTime);
      const isPremium = this.nicoApi.flvInfo.is_premium === 1;

      if (video && isPremium && isPlay && isNotEnd) {
        await recoadPlaybackPosition(this.getWatchId, video.currentTime, this.getCSRFToken);
      }
    }
  }

  domContentLoaded = () => {
    const detailURL = new DetailURL(location.href);

    if (detailURL.isNicofinder && !detailURL.hasDir('watch', 'player')) {
      return false;
    }

    window.addEventListener('beforeunload', this.beforeUnload);

    const watchApiElement = document.querySelector('.watch-api');
    const watchInfoElement = document.querySelector('.watch-data');

    if (!watchApiElement || !watchInfoElement) return false;

    this.web.videoInfo = JSON.parse(watchApiElement.innerHTML);
    this.web.watchInfo = JSON.parse(watchInfoElement.innerHTML);

    if (this.web.watchInfo.version.startsWith('2.')) {
      this.player = document.getElementById('player');

      this.player.addEventListener('reAuthRequest', this.fetchNicohistoryRequest);
      this.player.addEventListener('changeQuality', this.changeQuality);
      this.player.addEventListener('videoWatchRequest', this.videoWatchRequest);
      this.player.addEventListener('optionchange', this.changePlayerSettings);
      this.player.addEventListener('navigate', this.onNavigateEvent);
      this.player.addEventListener('initHTML5Video', this.initHTML5Video);
      this.player.addEventListener('postChatRequest', this.postChatRequest);

      var observer = new MutationObserver(mutations => mutations.forEach(mutation => {
        for (let item of mutation.addedNodes) {
          if (item.nodeType === 1 && item.classList.contains('extension-receiver')) {
            this.receiver = item;
            observer.disconnect();
            break;
          }
        }
      }));

      observer.observe(this.player, {
        childList: true
      });
    }
  }

  async fetchWatchEmbeddedAPI(isEconomy) {
    const watchDocument = await fetchWatchHTML({
      watchId: this.getWatchId,
      isEconomy: isEconomy
    });

    if (this.isHTML5) {
      const embeddedAPI = watchDocument.getElementById('js-initial-watch-data');

      this.nicoApi.watchInfo = JSON.parse(embeddedAPI.dataset.apiData);
      this.nicoApi.watchEnv = JSON.parse(embeddedAPI.dataset.environment);
    } else {
      const embeddedAPI = watchDocument.getElementById('watchAPIDataContainer');

      this.nicoApi.watchInfo = JSON.parse(embeddedAPI.innerText);
    }
  }

  videoWatchRequest = async () => {
    let flvKeyName;
    let eventType;

    this.nicoApi.flvInfo = await fetchFlvInfo({
      v: this.getWatchId,
      eco: this.isForceEconomy
    });

    if (this.web.watchInfo.version.startsWith('2.0.')) {
      flvKeyName = 'getflv';
      eventType = 'watch';
    } else {
      flvKeyName = 'flvInfo';
      eventType = 'completeFetchWatchInfo';
    }

    if (getIn(this, 'nicoApi.flvInfo.closed')) {
      this.dispatchPlayerEvent({
        type: eventType,
        data: {
          [flvKeyName]: this.nicoApi.flvInfo
        }
      });
    } else {
      await this.fetchWatchEmbeddedAPI();

      this.videoWatchResponse();

      if (this.nicoApi.flvInfo.is_premium) {
        this.fetchStoryboard();
      }
    }
  }

  async videoWatchResponse() {
    let flvKeyName;
    let eventType;

    if (this.web.watchInfo.version.startsWith('2.0.')) {
      flvKeyName = 'getflv';
      eventType = 'watch';
    } else {
      flvKeyName = 'flvInfo';
      eventType = 'completeFetchWatchInfo';
    }

    let result = {
      [flvKeyName]: this.nicoApi.flvInfo
    };

    // Dmc
    if (this.getDmcInfo !== null && this.web.watchInfo.version.startsWith('2.1.')) {
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
    if (this.isHTML5 && this.nicoApi.watchInfo.context.initialPlaybackType === 'resume') {
      result.resume = {
        playbackPosition: this.nicoApi.watchInfo.context.initialPlaybackPosition
      };
    }

    this.dispatchPlayerEvent({
      type: eventType,
      data: result
    });
  }

  async fetchStoryboard() {
    const storyboard = await fetchStoryboard(this.getVideoSource).catch(err => {
      this.dispatchPlayerEvent({
        type: 'error',
        data: 'storyboard'
      });
    });

    if (!storyboard) return;

    this.dispatchPlayerEvent({
      type: this.web.watchInfo.version.startsWith('2.0.') ? 'storyboard' : 'completeFetchStoryboard',
      data: storyboard
    });
  }

  dispatchPlayerEvent(data) {
    if (!this.receiver) return;

    this.receiver.value = JSON.stringify(data);
  }

  changePlayerSettings = () => {
    this.storage.update('player_setting_v2');
  }

  onNavigateEvent = (e) => {
    setIn(this, 'web.videoInfo', e.detail);
  }

  postChatRequest = (e) => {
    const vpos = Math.floor(this.video.currentTime * 100);

    const lastPostChat = this.storage.comment_history
      ? this.storage.comment_history[this.storage.comment_history.length - 1]
      : null;

    let request = {
      threadId: this.nicoApi.flvInfo.thread_id,
      serverUrl: this.nicoApi.flvInfo.ms,
      command: new Set(e.detail.command.split(' ')),
      comment: e.detail.comment,
      vpos: vpos,
      isAnonymity: e.detail.isAnonymity,
      isPremium: this.nicoApi.flvInfo.is_premium,
      isNeedsKey: Boolean(this.nicoApi.flvInfo.needs_key),
      isAllowContinuousPosts: this.storage.player_setting_v2.allow_continuous_posts,
      userId: this.nicoApi.flvInfo.user_id,
      lastPostChat: lastPostChat
    };

    if (this.isHTML5) {
      request = Object.assign({}, request, {
        userKey: this.nicoApi.watchInfo.context.userkey
      });
    }

    new CommentPost(request).then(res => {

      this.storage.push('comment_history', {
        thread: res.chat.thread,
        no: res.chat.no,
        vpos: res.chat.vpos,
        mail: res.chat.mail,
        user_id: this.nicoApi.flvInfo.user_id,
        body: res.chat.content,
        date: res.chat.date
      });

      this.dispatchPlayerEvent({
        type: 'extensionSendLocalMessage',
        data: res
      });
    });
  }

  initHTML5Video = () => {
    this.video = this.player.querySelector('#html5-video');

    const anonymityPostElement = document.getElementById('comment_anonymity_post');

    // 匿名投稿オプションを表示
    if (getIn(this, 'storage.player_setting_v2.comment_anonymity_post')) {
      anonymityPostElement.checked = this.storage.player_setting_v2.comment_anonymity_post;
      anonymityPostElement.parentElement.classList.remove('hide');
    }

    // v2.0.* のページはコメント投稿を無効にする
    if (this.web.watchInfo.version.startsWith('2.0.')) {
      const commentAlert = document.querySelector('.player-comment-alert');

      if (commentAlert) {
        const message = document.createElement('a');

        message.href = location.href;
        message.innerText = 'コメント投稿はこちらのページから行なえます';
        message.addEventListener('click', e => {
          e.preventDefault();

          Cookies.set('nicofinder-future', 1, {
            domain: 'nicofinder.net'
          });

          location.reload();
        });

        commentAlert.innerHTML = '';
        commentAlert.appendChild(message);
        commentAlert.style.display = 'block';
      }
    }
  }

  fetchNicohistoryRequest = async () => {
    await fetchWatchAPI({
      watchId: this.getWatchId,
      playlistToken: this.getPlaylistToken
    }).catch(e => {
      this.dispatchPlayerEvent({
        type: 'error',
        data: e
      });
    });

    this.dispatchPlayerEvent({
      type: 'reFetchNicohistory'
    });
  }

  changeQuality = async (e) => {
    const request = e.detail;

    let result = {};

    switch (request.type) {
      case 'smile':
      case 'smile-economy': {
        const isEconomy = request.type === 'smile-economy';

        if (this.dmcGateway !== null) {
          await this.dmcGateway.deleteSession();
          this.dmcGateway = null;
        }

        this.nicoApi.watchInfo = await fetchWatchAPI({
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

        this.nicoApi.watchInfo = await fetchWatchAPI({
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

    this.dispatchPlayerEvent({
      type: 'completeDmcQuality',
      data: result
    });
  }

  get isForceEconomy() {
    return this.web.videoInfo.video.movie_type === 'flv' ? 1 : 0;
  }

  get getWatchId() {
    if (getIn(this, 'nicoApi.watchInfo.context.watchId')) {
      return this.nicoApi.watchInfo.context.watchId;
    } else if (getIn(this, 'nicoApi.watchInfo.videoDetail.v')) {
      return this.nicoApi.watchInfo.videoDetail.v;
    } else {
      return this.web.videoInfo.video.channel
           ? this.web.videoInfo.video.channel_thread
           : this.web.videoInfo.video.id;
    }
  }

  get getVideoSource() {
    if (getIn(this, 'nicoApi.watchInfo.video.source')) {
      return this.nicoApi.watchInfo.video.source;
    } else if (getIn(this, 'nicoApi.watchInfo.flvInfo.url')) {
      return this.nicoApi.watchInfo.flvInfo.url;
    } else {
      return null;
    }
  }

  get getDmcInfo() {
    if (getIn(this, 'nicoApi.watchInfo.video.dmcInfo')) {
      return this.nicoApi.watchInfo.video.dmcInfo;
    } else if (getIn(this, 'nicoApi.watchInfo.flashvars.dmcInfo')) {
      return JSON.parse(decodeURIComponent(this.nicoApi.watchInfo.flashvars.dmcInfo));
    } else {
      return null;
    }
  }

  get getPlaylistToken() {
    if (getIn(this, 'nicoApi.watchEnv.playlistToken')) {
      return this.nicoApi.watchEnv.playlistToken;
    } else if (getIn(this, 'nicoApi.watchInfo.playlistToken')) {
      return this.nicoApi.watchInfo.playlistToken;
    } else {
      return null;
    }
  }

  get getCSRFToken() {
    if (getIn(this, 'nicoApi.watchInfo.context.csrfToken')) {
      return this.nicoApi.watchInfo.context.csrfToken;
    } else if (getIn(this, 'nicoApi.watchInfo.flashvars.csrfToken')) {
      return this.nicoApi.watchInfo.flashvars.csrfToken;
    } else {
      return null;
    }
  }
};

new Nicofinder();
