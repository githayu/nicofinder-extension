import $ from 'jquery';
import getIn from 'lodash.get';
import setIn from 'lodash.set';
import { Utils, DetailURL } from '../utils';
import NicoAPI from '../nicoApi';
import CommentPost from '../commentPost';

class Nicofinder {
  web = {
    videoInfo: null,
    watchInfo: null
  };

  nicoApi = {
    flvInfo: null,
    dmcInfo: null,
    watchInfo: null,
    dmcSessionXML: null,
    isHTML5: false
  };

  player = null;
  video = null;
  receiver = null;

  constructor() {
    document.addEventListener('DOMContentLoaded', this.domContentLoaded.bind(this));
  }

  onNavigateEvent = e => {
    e => this.stateChange(['web', 'videoInfo'], e.detail)
    setIn(this, 'web.videoInfo', e.detail);
  }

  get isForceEconomy() {
    return this.web.videoInfo.video.movie_type === 'flv' ? 1 : 0;
  }

  get getMainVideoId() {
    return this.web.videoInfo.video.channel
      ? this.web.videoInfo.video.channel_thread
      : this.web.videoInfo.video.id;
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

    if (getIn(this, 'web.watchInfo.version') === 2) {
      this.initialize();
    } else {
      return false;
    }
  }

  initialize() {
    this.player = document.getElementById('player');
    this.player.addEventListener('reAuthRequest', this.getNicohistoryRequest.bind(this));
    this.player.addEventListener('getDmcSesstionRequest', this.getDmcSesstionRequest.bind(this));
    this.player.addEventListener('videoQualityChangeRequest', this.videoQualityChangeRequest.bind(this));
    this.player.addEventListener('videoWatchRequest', this.videoWatchRequest.bind(this));
    this.player.addEventListener('optionchange', storage.update('player_setting_v2'));
    this.player.addEventListener('navigate', this.onNavigateEvent);
    this.player.addEventListener('initHTML5Video', this.initHTML5Video.bind(this));

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

  async getNicohistoryRequest() {
    await this.fetchWatchInfo().catch(e => {
      this.dispatchPlayerEvent({
        type: 'error',
        data: e
      });
    });

    this.dispatchPlayerEvent({
      type: 'reFetchNicohistory'
    });
  }

  async fetchDmcToken() {
    await this.fetchWatchInfo();

    if (this.nicoApi.isHTML5) {
      if (getIn(this, 'nicoApi.watchInfo.video.dmcInfo')) {
        this.nicoApi.dmcInfo = this.nicoApi.watchInfo.video.dmcInfo;
      }
    } else {
      if (getIn(this, 'nicoApi.watchInfo.flashvars.dmcInfo')) {
        this.nicoApi.dmcInfo = JSON.parse(
          decodeURIComponent(this.nicoApi.watchInfo.flashvars.dmcInfo)
        );
      }
    }
  }

  async fetchWatchInfo(economy) {
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

  async videoWatchRequest() {
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
      Nico.player.command.init();

      // nicohistory & dmc
      await this.fetchDmcToken().catch(e => {
        console.warn(e);

        this.dispatchPlayerEvent({
          type: 'error',
          data: 'nicohistory'
        });
      });

      this.videoWatchResponse();

      if (this.nicoApi.flvInfo.is_premium) {
        this.storyboardResponse();
      }
    }
  }

  async videoWatchResponse() {
    let result = {
      getflv: this.nicoApi.flvInfo
    };

    if (this.nicoApi.dmcInfo !== null) {
      await this.dmcSession('get');

      result = Object.assign({}, result, {
        dmcInfo: this.nicoApi.dmcInfo,
        dmcSession: Utils.xmlChildrenParser(this.nicoApi.dmcSessionXML.children)
      });
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

  async dmcSession(mode, dmcInfo = null, session = null) {
    if (dmcInfo === null) dmcInfo = this.nicoApi.dmcInfo.session_api;

    var sessionXML = await NicoAPI.dmcSession(mode, dmcInfo, session);

    switch (mode) {
      case 'get':
      case 'put':
        this.nicoApi.dmcSessionXML = sessionXML;
        break;
      case 'delete':
        this.nicoApi.dmcSessionXML = null;
        break;
    }
  }

  getDmcSesstionRequest() {
    this.dmcSession('put', null, this.nicoApi.dmcSessionXML);
  }

  async videoQualityChangeRequest(e) {
    const mode = e.detail;
    var result;

    if (this.nicoApi.dmcSessionXML !== null) {
      await this.dmcSession('delete', null, this.nicoApi.dmcSessionXML);
    }

    switch (mode) {
      case 'smile':
      case 'smile-economy': {
        await this.fetchWatchInfo(mode.endsWith('economy') ? 1 : 0);

        result = {
          mode: 'smile',
          values: {
            getflv: this.nicoApi.flvInfo
          }
        };

        break;
      }

      default: {
        await this.fetchDmcToken();
        await this.dmcSession('get', Object.assign({}, this.nicoApi.dmcInfo.session_api, {
          videos: this.videoQualiltySelector(mode)
        }));

        result = {
          mode: 'dmc',
          values: {
            dmcInfo: this.nicoApi.dmcInfo,
            dmcSession: Utils.xmlChildrenParser(this.nicoApi.dmcSessionXML.children)
          }
        };
      }
    }

    this.dispatchPlayerEvent({
      type: 'quality',
      data: result
    });
  }

  videoQualiltySelector(mode) {
    var videoQualitys = Array.from(this.nicoApi.dmcInfo.session_api.videos),
        splitQualitys = videoQualitys.map(quality => ({
          value: quality,
          kbps: quality.match(/(\d+)kbps/)[1],
          progressive: quality.match(/(\d+)p$/)[1]
        }));

    switch (mode) {
      case 'auto': {
        splitQualitys.sort((a, b) => {
          return a.progressive < b.progressive || a.progressive === b.progressive && a.kbps < b.kbps;
        });

        videoQualitys = splitQualitys.map(quality => quality.value);
        break;
      }

      case 'economy': {
        splitQualitys.sort((a, b) => {
          return a.progressive > b.progressive || a.progressive === b.progressive && a.kbps > b.kbps;
        });

        videoQualitys = splitQualitys.map(quality => quality.value);
        break;
      }

      default: {
        let index = videoQualitys.indexOf(mode);

        if (index === -1) return;

        // 優先度を最高にする
        videoQualitys.unshift(...videoQualitys.splice(index, 1));
      }
    }

    return videoQualitys;
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

  onPostComment() {
    if(!this.video || !this.nicoApi.flvInfo || !this.nicoApi.watchInfo) return;

    const command = document.querySelector('.player-command-input');
    const comment = document.querySelector('.player-comment-input');
    const vpos = Math.floor(this.video.currentTime * 100);

    if (!command || !comment) return;

    let request = {
      threadId: this.nicoApi.flvInfo.thread_id,
      serverUrl: this.nicoApi.flvInfo.ms,
      command: new Set(command.value.split(' ')),
      comment: comment.value,
      vpos: vpos,
      isAnonymity: storage.player_setting_v2.comment_anonymity_post,
      isPremium: this.nicoApi.flvInfo.is_premium,
      isNeedsKey: Boolean(this.nicoApi.flvInfo.needs_key),
      userId: this.nicoApi.flvInfo.user_id
    };

    if (this.nicoApi.isHTML5) {
      request = Object.assign({}, request, {
        userKey: this.nicoApi.watchInfo.context.userkey
      });
    } else {

    }

    new CommentPost(request).then(res => {

      storage.push('comment_history', {
        thread: res.chat.thread,
        no: res.chat.no,
        vpos: res.chat.vpos,
        mail: res.chat.mail,
        user_id: res.chat.user_id,
        body: res.chat.content,
        date: res.chat.date
      });

      this.dispatchPlayerEvent({
        type: 'extensionSendLocalMessage',
        data: res
      });
    }).catch(err => {
      console.log(err);
    });
  }

  initHTML5Video() {
    this.video = this.player.querySelector('#html5-video');

    const commandPanelElement = document.querySelector('.player-command-panel');
    const anonymityPostElement = document.getElementById('comment_anonymity_post');
    const commandInputElements = commandPanelElement.getElementsByTagName('input');
    const commandInputElement = document.querySelector('.player-command-input');
    const commentSendElement = document.querySelector('.player-comment-send');

    // 匿名投稿オプションを表示
    anonymityPostElement.checked = storage.player_setting_v2.comment_anonymity_post;
    anonymityPostElement.parentElement.classList.remove('hide');

    // コマンド変更イベントの登録
    for (let elem of commandInputElements) {
      elem.addEventListener('change', e => {
        const command = Nico.player.command.change(e.target.value);
        Nico.player.command.output(command);
      });
    }

    // コマンド入力イベントの登録
    ['keyup', 'blur'].forEach(type => {
      commandInputElement.addEventListener(type, e => {
        if ([8, 32, 46, 37, 38, 39, 40].includes(e.which)) {
          return;
        }

        var command = Nico.player.command.normalization(e.target.value);
        Nico.player.command.output(command);
      });
    });

    // コマンドフォーカスイベント
    commandInputElement.addEventListener('focus', () => {
      commandPanelElement.classList.add('show');

      const windowClickEvent = e => {
        if (!this.player.contains(e.target)) {
          commandPanelElement.classList.remove('show');
          window.removeEventListener('click', windowClickEvent);
        }
      };

      window.addEventListener('click', windowClickEvent);
    });

    // コメント投稿イベント
    commentSendElement.addEventListener('click', this.onPostComment.bind(this));
  }
};

class NicofinderStorage {
  static defaultItems = [
    'player_setting_v2',
    'comment_history'
  ];

  constructor() {
    this.constructor.defaultItems.forEach(name => this.update(name));
  }

  set(name, value) {
    if (!toString.call(this[name]).includes('Object')) return;
    var nextValue = Object.assign({}, this[name], value);
    localStorage.setItem(name, JSON.stringify(nextValue));
  }

  push(name, value) {
    if (this[name] === null) {
      this[name] = [];
    } else if (!Array.isArray(this[name])) {
      return false;
    }

    this[name].push(value);
    localStorage.setItem(name, JSON.stringify(this[name]));
  }

  update(name) {
    if (localStorage.getItem(name) === null) {
      this[name] = null;
    } else {
      this[name] = JSON.parse(localStorage.getItem(name));
    }
  }
};

var storage = new NicofinderStorage();
var nicofinder = new Nicofinder();

// ↓ 古いやつ

var Nico = {};

Nico.player = {
  state: {
    getflv: false,
    type: 'html5',
    command_panel: false,
    comment: {
      lastSend: null
    }
  },

  command: {
    regExp: {
      position: /^ue$|^shita$|^naka$/g,
      color: /^white$|^red$|^pink$|^orange$|^yellow$|^green$|^cyan$|^blue$|^purple$|^black$|^white2$|^niconicowhite$|^red2$|^truered$|^pink2$|^orange2$|^passionorange$|^yellow2$|^madyellow$|^green2$|^elementalgreen$|^cyan2$|^blue2$|^marineblue$|^purple2$|^nobleviolet$|^black2$|^#[A-za-z0-9]{6}$/g,
      size: /^big$|^medium$|^small$/g,
      advanced: /^full$|^ender$|^patissier$|^invisible$|^184$|^nicofinder$/g
    },

    /* 初期化
    -----------------------------------*/

    init: function() {
      if (Nico.player.state.command_panel) return;
      Nico.player.state.command_panel = true;

      var panel = {
            left: $('<div>').addClass('command-panel-left'),
            right: $('<div>').addClass('command-panel-right')
          },

          commands = {
            size: [
              ['大', 'big', false],
              ['中', 'medium', true],
              ['小', 'small', false]
            ],

            position: [
              ['上', 'ue', false],
              ['自動', 'naka', true],
              ['下', 'shita', false]
            ],

            // advanced: [
            //   ['Full', 'full', false],
            //   ['Patissier', 'patissier', false],
            //   ['Ender', 'ender', false],
            //   ['Invisible', 'invisible', false]
            // ]
          },

          colors = [
            ['white', 'red', 'pink', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'black'],
            ['white2', 'red2', 'pink2', 'orange2', 'yellow2', 'green2', 'cyan2', 'blue2', 'purple2', 'black2']
          ];

      // 色以外のコマンド
      for(var c in commands) {
        $(panel.left).append($('<fieldset>').attr('name', c).addClass('command-'+ c));
        var type = c !== 'advanced' ? 'radio' : 'checkbox';

        for(var i = 0; i < commands[c].length; i++) {
          $(panel.left).find('.command-'+ c)
            .append($('<label>').addClass(commands[c][i][1])
              .append($('<input>').attr({
                type: type,
                name: c,
                value: commands[c][i][1]
              }).prop('checked', commands[c][i][2]))
              .append($('<div>').text(commands[c][i][0])));
        }
      }

      // 色コマンド
      for(var i = 0; i < colors.length; i++) {
        if(nicofinder.nicoApi.flvInfo.is_premium == 0 && i === 1) continue;

        $(panel.right).append($('<fieldset>').attr('name', 'color').addClass('command-color'));

        for(var c = 0; c < colors[i].length; c++) {
          var check = colors[i][c] === 'white' ? true : false;

          $(panel.right).find('.command-color').eq(i)
            .append($('<label>').addClass(colors[i][c])
              .append($('<input>').attr({
                type: 'radio',
                name: 'color',
                value: colors[i][c]
              }).prop('checked', check))
              .append($('<div>')));
        }
      }

      // カラーコード選択フォームの追加
      if(nicofinder.nicoApi.flvInfo.is_premium == 1) {
        $(panel.right).find('.command-color').last()
          .append($('<input>').addClass('hex').attr({
            type: 'color',
            name: 'color'
          }));
      }

      // DOM追加
      $('.player-comment-form')
        .append($('<div>').addClass('player-command-panel')
          .append(panel.left).append(panel.right));
    },


    /* コマンド出力
    -----------------------------------*/

    output: function(command) {

      // カーラーコード処理
      if(/^#[A-za-z0-9]{6}$/.test(command.color)) {
        $('.player-command-panel').find('input[name=color]').not('.hex').val([]);
        $('.player-command-panel').find('input.hex').addClass('active');
      } else {
        $('.player-command-panel').find('input[name=position]').val([command.position]);
        $('.player-command-panel').find('input[name=color]').not('.hex').val([command.color]);
        $('.player-command-panel').find('input[name=size]').val([command.size]);
        $('.player-command-panel').find('input.hex').removeClass('active');
      }

      // コマンドの文字列化
      var result,
          temp = [
            command.position === 'naka' ? null : command.position,
            command.color === 'white' ? null : command.color,
            command.size === 'medium' ? null : command.size
          ];

      for(let key in command.advanced) {
        if(command.advanced[key]) {
          key = (key == 184 && storage.player_setting_v2.comment_anonymity_post) ? null : key;
          temp.push(key);
        }
      }

      result = temp.filter(function(v) {
        return v !== null;
      }).join(' ');

      // 出力
      $('.player-command-input').val(result);
    },


    /* コマンド変更
    -----------------------------------*/

    change: function(str) {
      var commands = this.normalization($('.player-command-input').val());

      loop: for(let key in this.regExp) {
        switch (key) {
          case 'position':
          case 'color':
          case 'size':
            if(str.match(this.regExp[key])) {
              commands[key] = str;
              break loop;
            } else break;

          case 'advanced':
            commands.advanced[str] = true;
            break loop;
        }
      }

      return commands;
    },


    /* コマンド正規化
    -----------------------------------*/

    normalization: function(str) {
      var commands = str.toLowerCase().split(/\s/).filter(function(x, i, s) {
            return s.indexOf(x) === i && x.length;
          }),

          commandBase = {
            size: 'medium',
            position: 'naka',
            color: 'white',
            advanced: {
              full: false,
              patissier: false,
              ender: false,
              invisible: false,
              184: storage.player_setting_v2.comment_anonymity_post
            }
          };


      loop: for(var i = 0; i < commands.length; i++) {
        for(let key in this.regExp) {

          switch (key) {
            case 'position':
            case 'color':
            case 'size':
              if(commands[i].match(this.regExp[key])) {
                commandBase[key] = commands[i];
                continue loop;
              }
              continue;
              break;

            case 'advanced':
              commandBase.advanced[commands[i]] = true;
              continue loop;

              break;
          }
        }
      }

      return commandBase;
    }
  }
};
