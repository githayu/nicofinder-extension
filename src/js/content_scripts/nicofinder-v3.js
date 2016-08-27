import NicoAPI from '../nicoApi';

class NicofinderWebExtension {
  constructor() {
    window.addEventListener('extensionRequest', ::this.extensionRequest);
  }

  extensionRequest(e) {
    var request = e.detail;

    if (!toString.call(request).includes('Object') && request.type === void 0) {
      return Promise.reject(false);
    }

    switch (request.type) {
      case 'watch':
        this.videoData = request.data;
        this.watchRequest();
        break;
    }
  }

  sendMessage(data) {
    var receiver = document.getElementById('extension');
    receiver.innerHTML = JSON.stringify(data);
  }

  async watchRequest() {
    var forceEconomy = this.videoData.movieType === 'flv' ? 1 : 0;

    this.getflv = await NicoAPI.getflv({
      v: this.videoData.mainThreadId,
      eco: forceEconomy
    });

    if (this.getflv.closed === void 0) {
      // nicohistory
      await NicoAPI.getNicoHistory(this.videoData.mainThreadId, {
        watch_harmful: 1,
        eco: forceEconomy
      }).then(() => {
        this.sendMessage({
          type: 'getflv',
          data: this.getflv
        });
      }).catch(e => {
        console.warn(e);
        this.sendMessage({
          type: 'error',
          data: 'nicohistory'
        });
      });

      // storyboard
      if (this.getflv.is_premium === 1) {
        NicoAPI.getStoryboard(this.getflv.url).then(storyboard => {
          this.sendMessage({
            type: 'storyboard',
            data: storyboard
          });
        }).catch(e => {
          console.warn(e);
          this.sendMessage({
            type: 'error',
            data: 'storyboard'
          });
        });
      }
    } else {
      this.sendMessage({
        type: 'getflv',
        data: this.getflv
      });
    }
  }
}

new NicofinderWebExtension();
