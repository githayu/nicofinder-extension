export default class {
  constructor(url) {
    try {
      this.url = new URL(url);
    } catch(e) {
      return false;
    }
  }

  getContentDir() {
    const dir = this.url.pathname.split('/').filter(i => i.length > 0).shift();

    switch (dir) {
      case 'watch':
      case 'mylist':
      case 'search':
        return dir;

      default:
        return false;
    }
  }

  getContentId() {
    const rootDir = this.getContentDir();

    switch (rootDir) {
      case 'mylist':
      case 'watch':
      case 'search':
        return this.url.pathname.split('/').pop();

      default:
        return false;
    }
  }

  hasDir(...req) {
    return req.includes(this.getContentDir());
  }

  get isNicofinder() {
    return this.url.hostname === 'www.nicofinder.net';
  }

  get isNiconico() {
    return this.url.hostname === 'www.nicovideo.jp';
  }
}