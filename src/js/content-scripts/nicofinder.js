import getIn from 'lodash.get';
import setIn from 'lodash.set';
import Cookies from 'js-cookie';
import { Utils, DetailURL } from '../utils';
import NicoAPI from '../nicoApi';
import CommentPost from '../niconico/post-chat';
import DMCGateway from '../niconico/dmc-gateway';
import NicofinderStorage from '../nicofinder/localstorage';

class Nicofinder {
  web = {
    videoInfo: null,
    watchInfo: null
  };

  nicoApi = {
    flvInfo: null,
    watchInfo: null,
    dmcSessionXML: null,
    isHTML5: false
  };

  player = null;
  video = null;
  receiver = null;
  storage = null;

  constructor() {
    this.storage = new NicofinderStorage();
    document.addEventListener('DOMContentLoaded', this.domContentLoaded.bind(this));
  }

  get isForceEconomy() {
    return this.web.videoInfo.video.movie_type === 'flv' ? 1 : 0;
  }

  get getMainVideoId() {
    return this.web.videoInfo.video.channel
      ? this.web.videoInfo.video.channel_thread
      : this.web.videoInfo.video.id;
  }

  get getDmcInfo() {
    if (this.nicoApi.isHTML5 && getIn(this, 'nicoApi.watchInfo.video.dmcInfo')) {
      return this.nicoApi.watchInfo.video.dmcInfo;
    } else if (getIn(this, 'nicoApi.watchInfo.flashvars.dmcInfo')) {
      return JSON.parse(decodeURIComponent(this.nicoApi.watchInfo.flashvars.dmcInfo));
    } else {
      return null;
    }
  }

  domContentLoaded() {
    const detailURL = new DetailURL(location.href);

    if (detailURL.isNicofinder && !detailURL.hasDir('watch', 'player')) {
      return false;
    }

    const watchApiElement = document.querySelector('.watch-api');
    const watchInfoElement = document.querySelector('.watch-data');

    if (!watchApiElement || !watchInfoElement) return false;

    this.web.videoInfo = JSON.parse(watchApiElement.innerHTML);
    this.web.watchInfo = JSON.parse(watchInfoElement.innerHTML);

    if (this.web.watchInfo.version.startsWith('2.')) {
      this.initialize();
    } else {
      return false;
    }
  }

  initialize() {
    this.player = document.getElementById('player');
    this.player.addEventListener('reAuthRequest', this.getNicohistoryRequest);
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

  dispatchPlayerEvent(data) {
    if (!this.receiver) return;

    this.receiver.value = JSON.stringify(data);
  }

  setLoginClass() {
    if (this.nicoApi.flvInfo.closed === 1) {
      this.player.classList.remove('login');
      this.player.classList.add('logout');
    } else {
      this.player.classList.remove('logout');
      this.player.classList.add('login');
    }
  }

  async fetchWatchAPI(economy) {
    const watchPage = await NicoAPI.getNicoHistory(this.getMainVideoId, {
      watch_harmful: 1,
      eco: economy || this.isForceEconomy
    });

    const parser = new DOMParser();
    const watchDocument = parser.parseFromString(watchPage, 'text/html');
    const nicoWatchInfoElement = watchDocument.getElementById('watchAPIDataContainer');
    const initialWatchDataElement = watchDocument.getElementById('js-initial-watch-data');

    if (initialWatchDataElement) {
      this.nicoApi.isHTML5 = true;
      this.nicoApi.watchInfo = JSON.parse(initialWatchDataElement.dataset.apiData);
    } else if (nicoWatchInfoElement) {
      this.nicoApi.isHTML5 = false;
      this.nicoApi.watchInfo = JSON.parse(nicoWatchInfoElement.innerText);
    } else {
      Promise.reject(new Error('watchAPI not found!'));
    }
  }

  async videoWatchResponse() {
    let result = {
      getflv: this.nicoApi.flvInfo
    };

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

    this.dispatchPlayerEvent({
      type: 'watch',
      data: result
    });
  }

  async storyboardResponse() {
    const storyboard = await NicoAPI.getStoryboard(this.nicoApi.flvInfo.url).catch(e => {
      this.dispatchPlayerEvent({
        type: 'error',
        data: 'storyboard'
      });
    });

    if (!storyboard) return;

    this.dispatchPlayerEvent({
      type: 'storyboard',
      data: storyboard
    });
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

    if (this.nicoApi.isHTML5) {
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

        message.href = '#';
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

  getNicohistoryRequest = async () => {
    await this.fetchWatchAPI().catch(e => {
      this.dispatchPlayerEvent({
        type: 'error',
        data: e
      });
    });

    this.dispatchPlayerEvent({
      type: 'reFetchNicohistory'
    });
  }

  videoWatchRequest = async () => {
    const forceEconomy = this.isForceEconomy;
    const mainVideoId = this.getMainVideoId;

    this.nicoApi.flvInfo = await NicoAPI.getflv({
      v: mainVideoId,
      eco: forceEconomy
    });

    if (getIn(this, 'nicoApi.flvInfo.closed')) {
      this.dispatchPlayerEvent({
        type: 'getflv',
        data: this.nicoApi.flvInfo
      });
    } else {
      this.setLoginClass();

      await this.fetchWatchAPI();

      this.videoWatchResponse();

      if (this.nicoApi.flvInfo.is_premium) {
        this.storyboardResponse();
      }
    }
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

        await this.fetchWatchAPI(isEconomy);

        result = Object.assign({}, result, {
          type: 'smile',
          payload: {
            source: this.nicoApi.watchInfo.video.source
          }
        });

        break;
      }

      default: {
        let session;

        if (this.dmcGateway === null) {
          this.dmcGateway = new DMCGateway(this.getDmcInfo.session_api);
          session = await this.dmcGateway.startSession(request.payload);
        } else {
          session = await this.dmcGateway.changeQuality(request.payload);
        }

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
};

new Nicofinder();
