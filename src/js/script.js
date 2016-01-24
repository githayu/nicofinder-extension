var Nico = {},
    DATA = {},
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

  init: function() {

    // 初期化
    Player.watch = document.getElementById('player');
    Player.flash = document.getElementById('external_nico_0');


    this.video();


    // 匿名投稿オプションを表示
    $('#comment_anonymity_post')
      .prop('checked', Nico.storage.current.player_setting_v2.comment_anonymity_post)
      .parent().removeClass('hide');


    Player.watch.addEventListener('optionchange', function(e) {
      Nico.storage.init('player_setting_v2');
    }, false);


    Player.watch.addEventListener('navigate', function(data) {
      DATA = $.extend({}, DATA, data.detail);
      Nico.player.video();
    }, false);


    // コマンド変更イベントの登録
    $('#player').on('change', '.player-command-panel input', function() {
      var command = Nico.player.command.change($(this).val());
      Nico.player.command.output(command);
    });

    // コマンド入力イベントの登録
    $('.player-command-input').on('keyup blur', function(e) {
      if([8, 32, 46, 37, 38, 39, 40].indexOf(e.which) >= 0) return;

      var command = Nico.player.command.normalization($(this).val());
      Nico.player.command.output(command);
    });

    // コマンドフォーカスイベント
    $('.player-command-input').on('focus', function() {
      $('.player-command-panel').addClass('show');

      $(document).click(function(event) {
        if (!$.contains($('#player').get(0), event.target)) {
          $('.player-command-panel').removeClass('show');
        }
      });
    });

    // Enter / Return での投稿
    // $('.player-comment-input').keyup(function(e) {
    //   if(e.which === 13) $('.player-comment-send').click();
    // });

    // コメント投稿イベント
    $('.player-comment-send').on('click', function() {
      switch (Nico.player.state.type) {
        case 'html5':
          if(!Player.html5) return;
          var currentTime = Player.html5.currentTime;
          break;

        case 'flash':
          if(Player.flash.ext_getPlayheadTime === undefined) return;
          var currentTime = Player.flash.ext_getPlayheadTime();
          break;
      }

      Nico.player.comment.check(
        $('.player-comment-input').val(),
        $('.player-command-input').val(),
        currentTime
      );
    });
  },

  video: function() {

    // getflvAPI
    var query = {
      v: DATA.video.channel == '1' ? DATA.video.channel_thread : DATA.video.id
    };

    if (DATA.video.movie_type === 'flv') query.eco = 1;

    Nico.api.flGetRequest('getflv', query)

    .done(function(data) {
      DATA.getflv = Nico.fn.parse_str(data);

      // ログインしていない
      if(DATA.getflv.closed == '1') {
        console.warn(DATA.getflv);

        $(Player.watch).addClass('logout');

      } else {
        Nico.player.state.getflv = true;

        var main_id = (DATA.video.channel) ? DATA.video.channel_thread : DATA.video.id,

            params = {
              watch_harmful: 1
            };

        if (DATA.video.movie_type === 'flv') params.eco = 1;

        $.get([
          'http://www.nicovideo.jp/watch/',
          main_id,
          '?',
          $.param(params)
        ].join(''))

        .done(function() {

          $(Player.watch).addClass('login').attr({
            'data-premium': DATA.getflv.is_premium,
            'data-src': DATA.getflv.url
          });

          if (!Nico.player.state.command_panel) Nico.player.command.init();
        })

        .fail(function(data) {

          console.error(data);

        });

      }
    })

    .fail(function(data) {
      console.warn(data);
    });
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
        if(Player.watch.dataset.premium == 0 && i === 1) continue;

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
      if(Player.watch.dataset.premium == 1) {
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

      for(key in command.advanced) {
        if(command.advanced[key]) {
          key = (key == 184 && Nico.storage.current.player_setting_v2.comment_anonymity_post) ? null : key;
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

      loop: for(key in this.regExp) {
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
              184: Nico.storage.current.player_setting_v2.comment_anonymity_post
            }
          };


      loop: for(var i = 0; i < commands.length; i++) {
        for(key in this.regExp) {

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
      if(!Nico.player.state.getflv) return;

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
      if(Nico.storage.current.player_setting_v2.comment_anonymity_post && !/(\s|^)184(\s|$)/.test(mail)) {
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
        thread: DATA.getflv.thread_id,
        version: 20090904,
        res_from: DATA.video.default_res
      })))


      // ポストキーの取得
      .then(function(xml) {

        // エラーチェック
        if($(xml).find('thread').attr('resultcode') == 0) {

          var blockNo = ~~ ($(xml).find('thread').attr('last_res') / 100);
              ticket = $(xml).find('thread').attr('ticket'),
              clickRevision = $(xml).find('thread').attr('click_revision');

          return Nico.api.flGetRequest('getpostkey', {
            thread: DATA.getflv.thread_id,
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
        postkey = Nico.fn.parse_str(key).postkey;

        // ポストキーがあれば
        if(postkey.length > 0) {

          return Nico.api.requestMessageServer($('<chat>').attr({
            thread: DATA.getflv.thread_id,
            vpos: vpos,
            mail: mail,
            ticket: ticket,
            user_id: DATA.getflv.user_id,
            postkey: postkey,
            premium: DATA.getflv.is_premium
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
            thread: DATA.getflv.thread_id,
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

        Nico.player.comment.sendLocalMessage(result);

        // コメント履歴に記録
        Nico.player.state.comment.lastSend = text;

        Nico.storage.put('comment_history', {
          thread: result.chat.thread,
          no: result.chat.no,
          vpos: result.chat.vpos,
          mail: result.chat.mail,
          user_id: result.chat.user_id,
          body: result.chat.content,
          date: result.chat.date
        });

      });
    },

    sendLocalMessage: function(obj) {
      switch (Nico.player.state.type) {
        case 'html5':
          if(!Player.html5) return;

          Player.watch.dispatchEvent(new CustomEvent('extensionSendLocalMessage', {
            detail: obj
          }));
          break;

        case 'flash':
          if(Player.flash.ext_getPlayheadTime === undefined) return;

          for(var i = 0; i < obj.length; i++) {
            Player.flash.ext_sendLocalMessage(obj[i].chat, obj[i].mail, ~~ (obj[i].vpos / 100));
          }
          break;
      }
    },

    checkResult: function(code) {
      switch (code) {
        // 投稿成功
        case 0:
          console.info('投稿に成功しました!');
          return true;
          break;

        // 投稿拒否
        case 1:
          console.warn('投稿が拒否されました');
          return false;
          break;

        // スレッドIDが変
        case 2:
          console.warn('スレッドIDがおかしいようです');
          return false;
          break;

        // 投稿チケットが変
        case 3:
          console.warn('投稿チケットがおかしいようです');
          return false;
          break;

        // ポストキーがおかしい
        case 4:
          console.warn('ポストキーがおかしいようです');
          return false;
          break;

        // コメント投稿がブロックされている
        case 5:
          console.warn('コメント投稿がブロックされています');
          return false;
          break;

        // コメントが書き込めない
        case 6:
          console.warn('コメントが書き込めませんでした');
          return false;
          break;

        // コメント数が長すぎる
        case 8:
          console.warn('コメント文字数が長すぎです');
          return false;
          break;

        // 例外エラー
        default:
          console.warn('例外エラーが発生しました');
          return false;
          break;
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

  requestStoryboard: function(url, param) {
    return $.ajax({
      url: url,
      type: 'get',
      dataType: 'xml',
      data: $.param(param)
    });
  },

  requestMessageServer: function(xml) {

    var ajax = {
      url: DATA.getflv.ms,
      type: 'post',
      dataType: 'xml',
      contentType: 'text/xml',
      data: $(xml).get(0).outerHTML
    }

    if (DATA.getflv.ms == 'http://nmsg.nicovideo.jp/api/') {
      ajax.contentType = 'application/xml';
    }

    return $.ajax(ajax);
  }
};


Nico.storage = {
  current: {},

  init: function(key) {
    if(localStorage.getItem(key)) {
      this.current[key] = JSON.parse(localStorage.getItem(key));
    } else {
      this.current[key] = [];
    }
  },

  set: function(key, obj) {
    var val = JSON.stringify($.extend(this.current[key], obj));
    localStorage.setItem(key, val);
  },

  put: function(key, obj) {
    this.current[key].push(obj);
    localStorage.setItem(key, JSON.stringify(this.current[key]));
  },

  remove: function(key, obj) {

  }
};


Nico.fn = {
  chrome_storage: function(type, obj) {
    chrome.storage.local[type](obj, function(data) {
      if(chrome.runtime.error) {
        console.error(chrome.runtime.error);
      } else {
        console.log(data);
      }
    });
  },

  parse_str: function(str) {
    var arr = str.split('&');
    var result = {};
    for(var i = 0; i < arr.length; i++) {
      var kv = arr[i].split('=');
      result[kv[0]] = decodeURIComponent(kv[1]);
    }
    return result;
  },

  mscv: function(ms) {
    ms = (ms < 0) ? 0 : ms;

    var h = (3600 <= ms) ? this.zeroPad(~~ (ms / 3600)) : null;
    var m = this.zeroPad(~~ ((ms / 60) % 60));
    var s = this.zeroPad(~~ (ms % 60));

    if(h != null) return h +':'+ m +':'+ s;
    else return m +':'+ s;
  },

  tscv: function(ts) {
    return ts.getFullYear() +'/'
    + this.zeroPad(ts.getMonth() + 1) +'/'
    + this.zeroPad(ts.getDate()) +' '
    + this.zeroPad(ts.getHours()) +':'
    + this.zeroPad(ts.getMinutes()) +':'
    + this.zeroPad(ts.getSeconds());
  },

  zeroPad: function(n) {
    return n < 10 ? '0'+ n : n;
  }
};


$(function() {

document.dispatchEvent(new CustomEvent('NicofinderExtension', {
  detail: true
}));

  // watchページの処理
  if(/(www|dev|staging)\.nicofinder\.net/.test(window.location.hostname) &&
       /^\/(watch|player)\/(\d{10}|[a-z]{2}\d+)$/.test(window.location.pathname)) {
    Nico.storage.init('comment_history');
    Nico.storage.init('player_setting_v2');


    // オブザーバインスタンスを作成
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        for(var n = 0; n < mutation.addedNodes.length; n++) {

          if(mutation.addedNodes[n].id === 'html5-video') {
            Player.html5 = document.querySelector('#html5-video');
            observer.disconnect();
          }

        }
      });
    });

    // 対象ノードを監視
    observer.observe(document.querySelector('#player'), {
      childList: true,
      subtree: true
    });


    window.addEventListener('DOMContentLoaded', function() {

      // データの読み込み
      eval($('#watch-data').html());

      // Page Ver.1 はサポートしない
      if (wd.version === 1) return false;

      DATA = Data;
      Nico.player.init();

    }, false);
  }
});
