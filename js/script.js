var Nico = {},
    Data = {},
    Player = {};

Nico.player = {
  state: {
    getflv: false,
    type: 'flash',

    comment: {
      lastSend: null
    }
  },

  init: function() {

    // 初期化
    Player.watch = document.getElementById('player');
    Player.flash = document.getElementById('external_nico_0');


    // getflvAPI
    Nico.api.flGetRequest('getflv', {
      v:  Data.video.channel ? Data.video.channel_thread : Data.video.id
    })

    .done(function(data) {
      Data.getflv = Nico.fn.parse_str(data);

      // ログインしていない
      if(Data.getflv.closed == '1') {
        console.warn(Data.getflv);

        $(Player.watch).addClass('logout');
        $('.alert-message').text('拡張機能を有効にするには')
          .append($('<a>').attr({
            href: 'http://www.nicovideo.jp/login',
            target: '_blank'
          }).text('ニコニコ動画へログイン'))
          .append('後更新をしてください');

      } else {
        Nico.player.state.getflv = true;

        $(Player.watch).addClass('login').attr({
          'data-premium': Data.getflv.is_premium,
          'data-src': Data.getflv.url
        });

        Nico.player.command.init();
      }
    })

    .fail(function(data) {
      console.warn(data);
    });


    // 設定追加
    if(Nico.storage.current.player_setting.comment_post_anonymous === undefined) {
      Nico.storage.set('player_setting', {
        comment_post_anonymous: true
      });
    }

    $('.player-setting').children('.section').eq(0)
      .append($('<label>')
        .text('常に匿名コメントで投稿')
        .prepend($('<input>')
          .attr({
            type: 'checkbox',
            name: 'comment_post_anonymous'
          })
          .addClass('option-item')
          .prop('checked', Nico.storage.current.player_setting.comment_post_anonymous)
    ));


    Player.watch.addEventListener('optionchange', function(e) {
      Nico.storage.init('player_setting');
    }, false);

    Player.watch.addEventListener('statuschange', function(e) {
      switch (e.detail.key) {
        case 'player_type':
          Nico.player.state.type = e.detail.val;

          if(Player.html5 === undefined && e.detail.val === 'html5') {
            if(document.getElementById('html5-player')) {
              Player.html5 = document.getElementById('html5-player');

            } else {
              var target = document.getElementsByClassName('videos-container')[0];

              // オブザーバインスタンスを作成
              var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                  for(var n = 0; n < mutation.addedNodes.length; n++) {
                    if(mutation.addedNodes[n].id === 'html5-player') {
                      Player.html5 = mutation.addedNodes[n];

                      observer.disconnect();
                    }
                  }
                });
              });

              // 対象ノードを監視
              observer.observe(target, {
                childList: true
              });
            }
          }
          break;
      }
    }, false);


    // コマンド変更イベントの登録
    $('.player-wrapper').on('change', '.video-command-panel input', function() {
      var command = Nico.player.command.change($(this).val());
      Nico.player.command.output(command);
    });

    // コマンド入力イベントの登録
    $('.video-command-input').on('keyup blur', function(e) {
      if([8, 32, 46, 37, 38, 39, 40].indexOf(e.which) >= 0) return;

      var command = Nico.player.command.normalization($(this).val());
      Nico.player.command.output(command);
    });

    // コマンドフォーカスイベント
    $('.video-command-input').on('focus', function() {
      $('.video-command-panel').addClass('show');

      $(document).click(function(event) {
        if (!$.contains($('#player').get(0), event.target)) {
          $('.video-command-panel').removeClass('show');
        }
      });
    });

    // Enter / Return での投稿
    // $('.video-comment-input').keyup(function(e) {
    //   if(e.which === 13) $('.video-comment-send').click();
    // });

    // コメント投稿イベント
    $('.video-comment-send').on('click', function() {
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
        $('.video-comment-input').val(),
        $('.video-command-input').val(),
        currentTime
      );
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
      $('.player-wrapper')
        .append($('<div>').addClass('video-command-panel')
          .append(panel.left).append(panel.right));
    },


    /* コマンド出力
    -----------------------------------*/

    output: function(command) {

      // カーラーコード処理
      if(/^#[A-za-z0-9]{6}$/.test(command.color)) {
        $('.video-command-panel').find('input[name=color]').not('.hex').val([]);
        $('.video-command-panel').find('input.hex').addClass('active');
      } else {
        $('.video-command-panel').find('input[name=position]').val([command.position]);
        $('.video-command-panel').find('input[name=color]').not('.hex').val([command.color]);
        $('.video-command-panel').find('input[name=size]').val([command.size]);
        $('.video-command-panel').find('input.hex').removeClass('active');
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
          key = (key == 184 && Nico.storage.current.player_setting.comment_post_anonymous) ? null : key;
          temp.push(key);
        }
      }

      result = temp.filter(function(v) {
        return v !== null;
      }).join(' ');

      // 出力
      $('.video-command-input').val(result);
    },


    /* コマンド変更
    -----------------------------------*/

    change: function(str) {
      var commands = this.normalization($('.video-command-input').val());

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
              184: Nico.storage.current.player_setting.comment_post_anonymous
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

      mail += ' nicofinder';

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
      if(Nico.storage.current.player_setting.comment_post_anonymous && !/(\s|^)184(\s|$)/.test(mail)) {
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
        thread: Data.getflv.thread_id,
        version: 20090904,
        res_from: Data.video.default_res
      })))


      // ポストキーの取得
      .then(function(xml) {

        // エラーチェック
        if($(xml).find('thread').attr('resultcode') == 0) {

          var blockNo = ~~ ($(xml).find('thread').attr('last_res') / 100);
              ticket = $(xml).find('thread').attr('ticket'),
              clickRevision = $(xml).find('thread').attr('click_revision');

          return Nico.api.flGetRequest('getpostkey', {
            thread: Data.getflv.thread_id,
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
            thread: Data.getflv.thread_id,
            vpos: vpos,
            mail: mail,
            ticket: ticket,
            user_id: Data.getflv.user_id,
            postkey: postkey,
            premium: Data.getflv.is_premium
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
            thread: Data.getflv.thread_id,
            version: 20090904,
            res_from: $(xml).find('chat_result').attr('no'),
            scores: 1,
            click_revision: clickRevision
          })));
        } else {
          return dfd.reject();
        }

      })

      // 最終処理
      .then(function(xml) {

        $('.video-comment-input').val('');

        // コメント挿入
        var chat = [];

        $(xml).find('chat').each(function() {
          chat.push({
            no: +this.getAttribute('no'),
            vpos: +this.getAttribute('vpos'),
            date: +this.getAttribute('date'),
            mail: this.getAttribute('mail'),
            user_id: this.getAttribute('user_id'),
            anonymity: +this.getAttribute('anonymity'),
            chat: this.innerHTML,
            score: this.getAttribute('score') ? +this.getAttribute('score') : 0,
            nico: this.getAttribute('nicoru') ? +this.getAttribute('nicoru') : 0,
            deleted: this.getAttribute('deleted') ? +this.getAttribute('deleted') : 0,
            fork: this.getAttribute('fork') ? true : false
          });
        });

        Nico.player.comment.sendLocalMessage(chat);
        Nico.player.comment.add(chat);

        // コメント履歴に記録
        Nico.player.state.comment.lastSend = text;

        Nico.storage.put('comment_history', {
          thread: Data.getflv.thread_id,
          vpos: vpos,
          mail: mail,
          user_id: Data.getflv.user_id,
          body: text,
          date: ~~ (+ new Date() / 1000)
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
    },

    add: function(obj) {
      $('#comments').find('.row').each(function() {
        if(!obj.length) return false;

        for(var i = 0; i < obj.length; i++) {
          if($(this).find('.vpos').data('vpos') >= obj[i].vpos) {

            var wrap = $('<div>').addClass('row').attr('data-cnum', obj[i].no),
                doms = {
                  cnum: $('<span>').addClass('cnum').text(obj[i].no),
                  vpos: $('<span>').addClass('vpos').text(Nico.fn.mscv(~~ (obj[i].vpos / 100))).attr('data-vpos', obj[i].vpos),
                  date: $('<span>').addClass('date').text(Nico.fn.tscv(new Date(obj[i].date * 1000))),
                  chat: $('<span>').addClass('chat').text(obj[i].chat)
                }

            for(var c = 0; c < Nico.storage.current.player_setting.comment_table_order.length; c++) {
              if(Nico.storage.current.player_setting.comment_table_resize[c] !== null) {
                doms[Nico.storage.current.player_setting.comment_table_order[c]]
                  .width(Nico.storage.current.player_setting.comment_table_resize[c]);
              }

              $(wrap).append(doms[Nico.storage.current.player_setting.comment_table_order[c]]);
            }

            $(this).before(wrap);

            obj.splice(i, 1);
            break;
          }
        }
      });
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
    return $.ajax({
      url: Data.getflv.ms,
      type: 'post',
      dataType: 'xml',
      data: $(xml).get(0).outerHTML
    });
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

  // watchページの処理
  if(/(www|dev)\.nicofinder\.net/.test(window.location.hostname) &&
       /^\/watch\/(\d{10}|[a-z]{2}\d+)$/.test(window.location.pathname)) {

    document.getElementById('player').className += ' extension';
    Nico.storage.init('comment_history');
    Nico.storage.init('player_setting');

    $(window).load(function() {

        // データの読み込み
        eval($('#video-data').html());

        Data = videoData;
        Nico.player.init();
    });
  }
});
