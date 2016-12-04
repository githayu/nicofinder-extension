import { Utils } from './utils';

export default class NicoAPI {
  static async getflv(qs) {
    return await Utils.xhr({
      method: 'post',
      url: 'http://flapi.nicovideo.jp/api/getflv',
      type: 'text',
      qs
    })
    .then(res => Utils.decodeURLParams(res));
  }

  static async getNicoHistory(id, qs) {
    return await Utils.xhr({
      method: 'post',
      url: `http://www.nicovideo.jp/watch/${id}`,
      type: 'text',
      qs
    });
  }

  static async getStoryboard(url) {
    return await Utils.xhr({
      url,
      type: 'xml',
      qs: {
        sb: 1
      }
    })
    .then(xml => Utils.xmlChildrenParser(xml.children).smile);
  }
};
