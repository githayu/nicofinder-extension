import { isDecimalNumber, xhr, xmlChildrenParser } from '../../js/utils';

export default class NicoAPI {
  constructor(video) {
    this.video = video;
  }

  fetch(options) {
    var url = new URL(options.url);

    if ('qs' in options) {
      Object.keys(options.qs).forEach(key => url.searchParams.append(key, options.qs[key]));
    }

    return fetch(url, options.request)
    .then(res => {
      if (res.status !== 200) return Promise.reject({
        status: false,
        code: res.status
      });

      return res[options.type]();
    }).catch(err => {
      return Promise.reject({
        status: false,
        code: err.code ? err.code : 'native',
        error: err.stack
      })
    });
  }

  async getflv() {
    var data = await this.fetch({
      url: 'http://flapi.nicovideo.jp/api/getflv',
      qs: {
        v: this.video.mainThreadId,
        eco: (this.video.movieType === 'flv') ? 1 : 0
      },
      type: 'text',
      request: {
        credentials: 'include'
      }
    });

    var result = {};

    data.split('&').forEach(query => {
      var [key, value] = query.split('=');
      result[key] = isDecimalNumber(value) ? Number(value) : decodeURIComponent(value);
    });

    return result;
  }

  async watch() {
    var id = this.video.id.startsWith('so') ? this.video.mainThreadId : this.video.id;

    return await xhr({
      url: `http://www.nicovideo.jp/watch/${id}`,
      qs: {
        watch_harmful: 1,
        eco: (this.video.movieType === 'flv') ? 1 : 0
      },
      type: 'text'
    });
  }

  async storyboard(url) {
    return await xhr({
      url,
      type: 'xml',
      qs: {
        sb: 1
      }
    }).then(xml => xmlChildrenParser(xml.children).smile);
  }

  async _videos() {
    var headers = new Headers();
    headers.append('Content-Type', 'application/json');

    return await this.fetch({
      url: `https://api.nicofinder.net/v2/videos`,
      type: 'json',
      request: {
        method: 'post',
        headers,
        body: JSON.stringify({
          id: [ this.video.id ]
        })
      }
    });
  }
}
