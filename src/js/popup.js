import { regExp } from './config';
import utils from './utils';

class Popup {
  constructor() {
    this.initialize();
  }

  async initialize() {
    var tabs = await utils.getActiveTabs(),
        match;

    if (match = utils.validateURL(tabs[0].url, { domain: 'nicovideo', name: 'watch' })) {
      let videoId = match[2];

      this.type = 'watch';
      this.videoInfo = await this.backgroundIO('getBackgroundData', 'videoInfo', videoId);

      if (this.videoInfo === null) {
        this.videoInfo = await this.backgroundIO('fetchVideoAPI', videoId);
      }

      this.thumbnailRender();
      this.appendAction([
        {
          type: 'link',
          label: 'Nicofinderで視聴',
          link: `http://www.nicofinder.net/watch/${this.videoInfo.video.id}`,
          class: ['watch'],
          tab: 'current'
        }, {
          type: 'link',
          label: 'コメント解析',
          link: `http://www.nicofinder.net/comment/${this.videoInfo.video.id}`,
          class: ['comment'],
          tab: 'create'
        }
      ]);
    } else if (match = utils.validateURL(tabs[0].url, { domain: 'nicovideo', name: 'mylist' })) {
      let mylistId = match[2];

      this.appendAction([
        {
          type: 'link',
          label: 'Nicofinderで開く',
          link: `http://www.nicofinder.net/mylist/${mylistId}`,
          class: ['mylist'],
          tab: 'current'
        }
      ]);
    } else {
      document.querySelector('.redirect-toggler').classList.add('nonNon');
    }

    // リダイレクト状態の反映
    chrome.storage.local.get('redirect', storage => {
      var toggler = document.querySelector('.redirect-toggle-switch');

      if (storage.redirect === true) {
        toggler.classList.add('on');
      } else {
        toggler.classList.add('off');
      }
    });

    // リダイレクト設定の変更
    document.querySelector('.redirect-toggle-switch').addEventListener('click', e => {
      var toggler = e.target;

      if (toggler.classList.contains('on')) {
        chrome.storage.local.set({
          redirect: false
        }, () => {
          toggler.classList.remove('on');
          toggler.classList.add('off');
        });
      } else {
        chrome.storage.local.set({
          redirect: true
        }, () => {
          toggler.classList.remove('off');
          toggler.classList.add('on');
        });
      }
    });
  }

  backgroundIO(type, data, options) {
    return new Promise(resolve => chrome.runtime.sendMessage({ type, data }, res => {
      switch (type) {
        case 'getBackgroundData': {
          if (res === null) return resolve(null);

          if (toString.call(res).includes('Object')) {
            if (res.thread.id !== options && res.video.id !== options) return resolve(null);
          }

          break;
        }
      }

      return resolve(res);
    }));
  }

  appendAction(req) {
    var actions = document.querySelector('.actions');

    for (let item of req) {
      let liTag = document.createElement('li'),
          liClass = Array.isArray(item.class) ? item.class.concat([item.type]) : [item.type],
          aTag = document.createElement('a');

      liTag.classList.add(...liClass);

      aTag.href = item.link;
      aTag.innerText = item.label;

      aTag.addEventListener('click', e => {
        e.preventDefault();

        switch (item.tab) {
          case 'create': {
            chrome.tabs.create({
              url: aTag.href
            }, () => window.close());
            break;
          }

          default: {
            utils.getActiveTabs().then(tabs => {
              chrome.tabs.update(tabs[0].id, {
                url: aTag.href
              }, () => window.close());
            });
          }
        }
      });

      liTag.appendChild(aTag);
      actions.appendChild(liTag);
    }
  }

  thumbnailRender() {
    switch (this.type) {
      case 'watch': {
        let thumbnail = document.querySelector('.thumbnail'),
            img = new Image();

        img.addEventListener('load', () => {
          thumbnail.style.backgroundImage = `url(${img.src})`;
          thumbnail.style.display = 'block';
        });

        if (this.videoInfo.video.options['@large_thumbnail'] == 1) {
          img.src = `${this.videoInfo.video.thumbnail_url}.L`;
        } else {
          img.src = this.videoInfo.video.thumbnail_url;
          thumbnail.classList.add('small');
        }

        break;
      }
    }
  }
}

var popup = new Popup();
