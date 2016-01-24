var Popup = {
  state: {},

  init: function() {

    // アクティブタブを取得
    chrome.tabs.query({
      active: true
    }, function(tabs) {

      var temp;

      for (var i = 0; i < tabs.length; i++) {

        if(temp = tabs[i].url.match(Nicofinder.Define.Regexp.Views)) {
          chrome.runtime.sendMessage({
            get: ['type', 'id']
          }, function (res) {
            Popup.state.type = temp[2];
            Popup.state.id = temp[3];

            if(temp[2] === res.type && temp[3] === res.id) {
              // 同じ
            } else {
              // 違う
            }

            Popup.view();
          });

          return;
        }

        Popup.view();
      }

    });

    // リダイレクト設定の判定
    chrome.storage.local.get({
      redirect: false
    }, function(res) {

      if(res.redirect) $('#setting').find('.redirect').find('.toggle').addClass('on no-anime');

    });

    // リダイレクト設定の変更
    $('#setting').find('.redirect').find('.toggle').click(function() {
      var self = this;

      $(this).removeClass('no-anime');

      if($(this).hasClass('on')) {

        chrome.storage.local.set({
          redirect: false
        }, function() {
          $(self).removeClass('on');
        });

      } else {

        chrome.storage.local.set({
          redirect: true
        }, function() {
          $(self).addClass('on');
        });
      }
    });

    $('#action').on('click', '.trigger', function() {
      Popup.redirector([Nicofinder.Define.Host.URL, this.dataset.action, Popup.state.id].join('/'), this.dataset.tab);
    });

    $('#container').find('.nicofinder-link').click(function() {
      Popup.redirector(Nicofinder.Define.Host.URL);
    });
  },

  view: function() {

    var addList = function(actionName, listName, tab) {
        var tab = tab || 'current';

        $('#action')
          .append($('<li>')
            .addClass([actionName, 'trigger'].join(' '))
            .text(listName)
            .attr({
              'data-action': actionName,
              'data-tab': tab
            }));
    }

    switch (this.state.type) {
      case 'watch':

        var d = new $.Deferred,
            thumbinfo;

        function checkImage(src) {
          var img_deferred = new $.Deferred(),
              thumbnail = new Image();
              thumbnail.src = src;

          $(thumbnail)
          .on('error', function() {
            img_deferred.resolve(false);
          })

          .on('load', function() {
            img_deferred.resolve(true);
          });

          return img_deferred.promise();
        };

        function addImage(src, type) {
          $('#thumbnail').css({
            'background-image': 'url('+ src +')'
          }).addClass(type).show();
        };


        // getthumbinfo
        Nicofinder.request.getthumbinfo(Popup.state.id)

        // ステータスチェック
        .then(function(data) {

          thumbinfo = data;

          if ($(thumbinfo).attr('status') == 'ok') {
            return d.resolve();
          } else {
            addImage('http://res.nimg.jp/img/common/video_deleted_ja-jp.jpg', 'deleted');

            return d.reject();
          }
        })

        // LargeSizeの画像が存在するかチェック
        .then(function() {
          return checkImage($(thumbinfo).find('thumbnail_url').text() +'.L');
        })

        // サムネイルの表示
        .then(function(res) {
          if(res) {
            addImage($(thumbinfo).find('thumbnail_url').text() +'.L');
          } else {
            addImage($(thumbinfo).find('thumbnail_url').text(), 'small');
          }
        });

        addList('watch', 'Nicofinderで視聴');
        addList('comment', 'コメントを解析', 'new');
        break;

      case 'mylist':
        addList('mylist', 'Nicofinderで閲覧');
        break;
    }
  },

  redirector: function(url, tab) {
    switch (tab) {
      case 'new':
        chrome.tabs.create({
          url: url
        });
        break;

      default:
        chrome.tabs.update(null, {
          url: url
        });

        window.close();
        break;
    }
  }
}

Popup.init();
