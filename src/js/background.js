var BG = {
  state: {},

  storage: {
    local: {},
    cache: {}
  },

  init: function () {

    chrome.contextMenus.create({
      title: '動画IDをコピー',
      type: 'normal',
      contexts: ['link'],
      documentUrlPatterns: ['http://*.nicovideo.jp/*'],
      onclick: function (info) {

        var id =  info.linkUrl.match(Nicofinder.Define.Regexp.Views)[3],
            range = document.createRange(),
            elem = document.createElement('p');

        elem.setAttribute('id', 'clip-board');
        elem.innerText = id;

        document.body.appendChild(elem)

        range.selectNode(elem);
        window.getSelection().addRange(range);

        document.execCommand('copy');

        window.getSelection().removeAllRanges();
        document.body.removeChild(elem);
      }
    });

    // Chrome Local Storage のキャッシュ
    chrome.storage.local.get(['redirect'], function(res) {
      BG.storage.local = res;
    });


    // Chrome Storage の変更イベント
    chrome.storage.onChanged.addListener(function (changes, areaName) {
      for(var key in changes) {
        BG.storage[areaName][key] = changes[key].newValue;
      }
    });


    // リダイレクト
    chrome.webRequest.onBeforeRequest.addListener(function (details) {
      var temp,
          vars = Nicofinder.fn.url_vars_decode((function() {
            var url = details.url.split('?');
            return '?'+ url[url.length - 1];
          })());

      if (vars.nicoview == 1) return false;

      if(temp = details.url.match(Nicofinder.Define.Regexp.Views)) {
        BG.state.type = temp[2];
        BG.state.id = temp[3];

        if(BG.storage.local.redirect) {
          return {
            redirectUrl: [Nicofinder.Define.Host.URL, BG.state.type, BG.state.id].join('/')
          }
        }
      }

    }, {
      urls: ['http://*.nicovideo.jp/*'],
      types: ['main_frame']
    }, ['blocking']);


    // JS
    chrome.webRequest.onBeforeRequest.addListener(function (details) {
      // if (/^https?:\/\/(www|dev|staging)\.nicofinder\.net\/js\/player\/\d+\/player\.js/.test(details.url)) {
      //   return {
      //     redirectUrl: details.url.replace(/player.js.*$/, 'extension.js')
      //   }
      // }

      if (details.url.startsWith('http://res.nimg.jp/js/watch/player/player.js')) {
        return {
          cancel: true
        }
      }
    }, {
      urls: [
        '*://*.nicofinder.net/*',
        'http://*.nimg.jp/*'
      ],
      types: ['script']
    }, ['blocking']);


    // Page Action の表示
    chrome.tabs.onUpdated.addListener(function (tabId, changeinfo, tab) {
      if(Nicofinder.Define.Regexp.Niconico.test(tab.url) || Nicofinder.Define.Regexp.Nicofinder.test(tab.url)) {

        /* なんかぼやけるのでやーめた

        if(BG.storage.local.redirect) {
          chrome.pageAction.setIcon({
            tabId: tabId,
            path: 'img/page-action-icon-active.png'
          });
        }*/

        chrome.pageAction.show(tabId);
      }
    });


    // Message I/O
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      var response = {};

      for(var key in request) {
        switch (key) {
          case 'get':

            for(var i = 0; i < request.get.length; i++) {
              if(0 <= request.get.indexOf('type')) response.type = BG.state.type;
              if(0 <= request.get.indexOf('id')) response.id = BG.state.id;
              if(0 <= request.get.indexOf('lastinfo')) {
                if(typeof BG.storage.cache.lastinfo !== undefined) response.lastinfo = BG.storage.cache.lastinfo;
                else response.lastinfo = false;
              }
            }

            break;

          case 'set':

            for(var item = 0; item < request.set.length; item++) {
              switch (request.set[item][0]) {
                case 'lastinfo':

                  BG.storage.cache.lastinfo = request.set[item][1];
                  response = true;

                  break;
              }
            }

            break;
        }
      }

      sendResponse(response);
    });
  }
};

$(function() {
  BG.init();
});
