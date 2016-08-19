import $ from 'jquery';
import { defaultStorage, regExp } from '../config';
import { getActiveTabs, isDecimalNumber, xhr, xmlChildrenParser } from '../utils';

class Nicofinder {
  constructor() {
    document.addEventListener('DOMContentLoaded', ::this.domContentLoaded);
  }

  domContentLoaded() {
    if (!regExp.nicofinder.host.test(location.hostname) ||
        !regExp.nicofinder.v2.test(window.location.pathname)) {
      return false;
    }

    // データの読み込み
    this.videoInfo = JSON.parse(document.querySelector('.watch-api').innerHTML);
    this.watchInfo = JSON.parse(document.querySelector('.watch-data').innerHTML);
    if (this.videoInfo === null || this.watchInfo === null) return false;

    // Page Ver.2 以外サポートしない
    if (this.watchInfo.version != 2) {
      return false;
    } else {
      this.initialize();
    }
  }

  initialize() {
    this.player = document.getElementById('player');
    this.player.addEventListener('reAuthRequest', ::this.reAuthRequest);
    this.player.addEventListener('videoWatchRequest', ::this.videoWatchRequest);
    this.player.addEventListener('optionchange', storage.update('player_setting_v2'));
    this.player.addEventListener('navigate', e => this.stateChange('videoInfo', e.detail));
    this.player.addEventListener('initHTML5Video', ::this.initHTML5Video);

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
    this.receiver.value = JSON.stringify(data);
  }

  async reAuthRequest() {
    await NicoAPI.getNicoHistory(this.getMainVideoId(), {
      watch_harmful: 1,
      eco: this.isForceEconomy()
    }).catch(e => {
      console.warn(e);
      this.dispatchPlayerEvent({
        type: 'error',
        data: 'reFetchNicohistory'
      });
    });

    this.dispatchPlayerEvent({
      type: 'reFetchNicohistory'
    });
  }

  async videoWatchRequest() {
    var forceEconomy = this.isForceEconomy(),
        mainVideoId = this.getMainVideoId();

    this.getflv = await NicoAPI.getflv({
      v: mainVideoId,
      eco: forceEconomy
    });

    if (this.getflv.closed === void 0) {
      this.setLoginClass();
      Nico.player.command.init();

      // nicohistory
      await NicoAPI.getNicoHistory(mainVideoId, {
        watch_harmful: 1,
        eco: forceEconomy
      }).then(() => {
        this.dispatchPlayerEvent({
          type: 'getflv',
          data: this.getflv
        });
      }).catch(e => {
        console.warn(e);
        this.dispatchPlayerEvent({
          type: 'error',
          data: 'nicohistory'
        });
      });

      // storyboard
      if (this.getflv.is_premium === 1) {
        NicoAPI.getStoryboard(this.getflv.url).then(storyboard => {
          this.dispatchPlayerEvent({
            type: 'storyboard',
            data: storyboard
          });
        }).catch(e => {
          console.warn(e);
          this.dispatchPlayerEvent({
            type: 'error',
            data: 'storyboard'
          });
        });
      }
    } else {
      this.dispatchPlayerEvent({
        type: 'getflv',
        data: this.getflv
      });
    }
  }

  setLoginClass() {
    if (this.getflv.closed === 1) {
      this.player.classList.remove('login');
      this.player.classList.add('logout');
    } else {
      this.player.classList.remove('logout');
      this.player.classList.add('login');
    }
  }

  stateChange(name, value) {
    this[name] = value;
  }

  isForceEconomy() {
    return this.videoInfo.video.movie_type === 'flv' ? 1 : 0;
  }

  getMainVideoId() {
    return this.videoInfo.video.channel ? this.videoInfo.video.channel_thread : this.videoInfo.video.id;
  }

  initHTML5Video() {
    this.video = this.player.querySelector('#html5-video');

    // 匿名投稿オプションを表示
    $(this.player).find('#comment_anonymity_post')
      .prop('checked', storage.player_setting_v2.comment_anonymity_post)
      .parent().removeClass('hide');

    // コマンド変更イベントの登録
    $(this.player).find('.player-command-panel input').on('change', e => {
      var command = Nico.player.command.change(e.target.value);
      Nico.player.command.output(command);
    });

    // コマンド入力イベントの登録
    $(this.player).find('.player-command-input').on('keyup blur', e => {
      if([8, 32, 46, 37, 38, 39, 40].indexOf(e.which) >= 0) return;

      var command = Nico.player.command.normalization(e.target.value);
      Nico.player.command.output(command);
    });

    // コマンドフォーカスイベント
    $(this.player).find('.player-command-input').on('focus', () => {
      $('.player-command-panel').addClass('show');

      $(document).click(e2 => {
        if (!$.contains($('#player').get(0), e2.target)) {
          $('.player-command-panel').removeClass('show');
        }
      });
    });

    // コメント投稿イベント
    $(this.player).find('.player-comment-send').on('click', () => {
      if(this.video === null) return;

      Nico.player.comment.check(
        $('.player-comment-input').val(),
        $('.player-command-input').val(),
        this.video.currentTime
      );
    });
  }
};

class NicoAPI {
  static async getflv(qs) {
    var data = await xhr({
      method: 'post',
      url: 'http://flapi.nicovideo.jp/api/getflv',
      type: 'text',
      qs
    });

    var result = {};

    data.split('&').forEach(query => {
      var [key, value] = query.split('=');
      result[key] = isDecimalNumber(value) ? Number(value) : decodeURIComponent(value);
    });

    return result;
  }

  static async getNicoHistory(id, qs) {
    return await xhr({
      method: 'post',
      url: `http://www.nicovideo.jp/watch/${id}`,
      type: 'text',
      qs
    });
  }

  static async getStoryboard(url) {
    return await xhr({
      url,
      type: 'xml',
      qs: {
        sb: 1
      }
    }).then(xml => xmlChildrenParser(xml.children).smile);
  }
};


class NicofinderStorage {
  defaultItems = [
    'player_setting_v2',
    'comment_history'
  ];

  constructor() {
    this.defaultItems.forEach(name => this.update(name));
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

var Nico = {},
    Player = {};

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
        if(nicofinder.getflv.is_premium == 0 && i === 1) continue;

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
      if(nicofinder.getflv.is_premium == 1) {
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
  },

  comment: {
    check: function(text, mail, vpos) {
      if(!nicofinder.getflv) return;

      mail += ' ncf';

      // コメント末尾の空白文字は消す
      text = text.replace(/\s+$/, '');

      // コメントがないか、空白文字だけの場合
      if(!text) {
        console.warn('コメントがないよ!');
        return;
      } else if (/^\s+$/.test(text)) {
        console.warn('空白文字だけのコメントは投稿できません!');
        return;
      }

      // コメント数が1024文字を超える場合
      if(text.length > 1024) {
        console.warn('コメント文字数が長過ぎます!');
        return;
      } else if (text.length > 75) {
        console.info('75文字以上のコメントを投稿します');
      }

      // 匿名設定で184コマンドが無ければコマンド付加
      if(storage.player_setting_v2.comment_anonymity_post && !/(\s|^)184(\s|$)/.test(mail)) {
        mail += ' 184';
      };

      // コメント文字数が75文字を超えて匿名希望なら、強制的に匿名を解除
      if(text.length > 75 && /(\s|^)184(\s|$)/.test(mail)) {
        mail = mail.replace(/(\s184|184\s)/g, '');
        console.info('匿名コマンドの解除を行いました。');
      }

      // 連続で同じコメントをしていないか
      if(Nico.player.state.comment.lastSend === text) {
        console.warn('同じコメントを連続で投稿することはできません!');
        return;
      }

      // コマンドの前後に空白があれば削除 & 空白が2文字連続で存在すれば1文字に置換
      mail = mail.replace(/^\s+|\s+$/g, '').replace(/\s{2,}/, ' ');

      this.post(text, mail, vpos);
    },

    post: function(text, mail, vpos_sec) {
      var ticket,
          postKey,
          clickRevision,
          vpos = ~~ (vpos_sec * 100),
          dfd = $.Deferred();


      // 最新コメント数及び投稿チケットの取得
      Nico.api.requestMessageServer($('<packet>').append($('<thread>').attr({
        thread: nicofinder.getflv.thread_id,
        version: 20090904,
        res_from: nicofinder.videoInfo.video.default_res
      })))


      // ポストキーの取得
      .then(function(xml) {

        // エラーチェック
        if($(xml).find('thread').attr('resultcode') == 0) {

          var blockNo = ~~ ($(xml).find('thread').attr('last_res') / 100);
              ticket = $(xml).find('thread').attr('ticket'),
              clickRevision = $(xml).find('thread').attr('click_revision');

          return Nico.api.flGetRequest('getpostkey', {
            thread: nicofinder.getflv.thread_id,
            block_no: blockNo,
            device: 1,
            version: 1,
            version_sub: 2
          }, 'get');

        } else {
          console.warn('Ticketの取得に失敗したため、投稿処理を中断しました');
          return dfd.reject();
        }
      })


      // コメント投稿
      .then(function(key) {
        var postkey = Nico.fn.parse_str(key).postkey;

        // ポストキーがあれば
        if(postkey.length > 0) {

          return Nico.api.requestMessageServer($('<chat>').attr({
            thread: nicofinder.getflv.thread_id,
            vpos: vpos,
            mail: mail,
            ticket: ticket,
            user_id: nicofinder.getflv.user_id,
            postkey: postkey,
            premium: nicofinder.getflv.is_premium
          }).html(text));
        } else {
          console.warn('PostKeyの取得に失敗したため、投稿処理を中断しました');
          return dfd.reject();
        }
      })


      // 投稿コメント確認
      .then(function(xml) {

        // ステータスチェック
        if(Nico.player.comment.checkResult(+$(xml).find('chat_result').attr('status'))) {

          return Nico.api.requestMessageServer($('<packet>').append($('<thread>').attr({
            thread: nicofinder.getflv.thread_id,
            version: 20090904,
            res_from: $(xml).find('chat_result').attr('no'),
            scores: 1,
            nicoru: 1,
            with_global: 1,
            click_revision: clickRevision
          })));
        } else {
          return dfd.reject();
        }

      })

      // 最終処理
      .then(function(xml) {

        $('.player-comment-form').find('input[type=text]').val('');

        // コメント挿入
        var chat = xml.querySelector('chat'),
            counter = xml.querySelector('view_counter'),
            global = xml.querySelector('global_num_res'),

            result = {
              video: {
                id: counter.getAttribute('id'),
                thread: +global.getAttribute('thread'),
                view: +counter.getAttribute('video'),
                mylist: +counter.getAttribute('mylist'),
                comment: +global.getAttribute('num_res')
              },

              chat: {
                thread: +chat.getAttribute('thread'),
                no: +chat.getAttribute('no'),
                vpos: +chat.getAttribute('vpos'),
                date: +chat.getAttribute('date'),
                anonymity: +chat.getAttribute('anonymity'),
                user_id: chat.getAttribute('user_id'),
                content: chat.innerHTML,
                mail: chat.getAttribute('mail') ? chat.getAttribute('mail').split(' ') : [],
                score: chat.getAttribute('score') ? +chat.getAttribute('score') : 0,
                nicoru: chat.getAttribute('nicoru') ? +chat.getAttribute('nicoru') : 0,
                deleted: chat.getAttribute('deleted') ? +chat.getAttribute('deleted') : 0,
                fork: chat.getAttribute('fork') ? true : false
              }
            };

        nicofinder.dispatchPlayerEvent({
          type: 'extensionSendLocalMessage',
          data: result
        });

        // コメント履歴に記録
        Nico.player.state.comment.lastSend = text;

        chrome.storage.local.get({
          recordCommentHistory: defaultStorage.extension.local.recordCommentHistory
        }, response => {
          if (response.recordCommentHistory) {
            storage.push('comment_history', {
              thread: result.chat.thread,
              no: result.chat.no,
              vpos: result.chat.vpos,
              mail: result.chat.mail,
              user_id: result.chat.user_id,
              body: result.chat.content,
              date: result.chat.date
            });
          }
        });
      });
    },

    checkResult: function(code) {
      switch (code) {
        case 0:  // 投稿成功
          console.info('投稿に成功しました!');
          return true;

        case 1:  // 投稿拒否
          console.warn('投稿が拒否されました');
          return false;

        case 2:  // スレッドIDが変
          console.warn('スレッドIDがおかしいようです');
          return false;

        case 3:  // 投稿チケットが変
          console.warn('投稿チケットがおかしいようです');
          return false;

        case 4:  // ポストキーがおかしい
          console.warn('ポストキーがおかしいようです');
          return false;

        case 5:  // コメント投稿がブロックされている
          console.warn('コメント投稿がブロックされています');
          return false;

        case 6:  // コメントが書き込めない
          console.warn('コメントが書き込めませんでした');
          return false;

        case 8:  // コメント数が長すぎる
          console.warn('コメント文字数が長すぎです');
          return false;

        default:  // 例外エラー
          console.warn('例外エラーが発生しました');
          return false;
      }
    }
  }
};


Nico.api = {
  flGetRequest: function(name, param, type) {
    type = type || 'post';

    return $.ajax({
      url: 'http://flapi.nicovideo.jp/api/'+ name +'/',
      type: type,
      dataType: 'text',
      data: $.param(param)
    });
  },

  requestMessageServer: function(xml) {

    var ajax = {
      url: nicofinder.getflv.ms,
      type: 'post',
      dataType: 'xml',
      contentType: 'text/xml',
      data: $(xml).get(0).outerHTML
    }

    if (nicofinder.getflv.ms == 'http://nmsg.nicovideo.jp/api/') {
      ajax.contentType = 'application/xml';
    }

    return $.ajax(ajax);
  }
};


Nico.fn = {
  parse_str: function(str) {
    var arr = str.split('&');
    var result = {};
    for(var i = 0; i < arr.length; i++) {
      var kv = arr[i].split('=');
      result[kv[0]] = decodeURIComponent(kv[1]);
    }
    return result;
  }
};
