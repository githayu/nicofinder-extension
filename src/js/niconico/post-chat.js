import getIn from 'lodash.get';
import { Utils } from '../utils.js';
import { ValidateChat } from './';

export default class PostChat {
  static threadKeyUrl = 'http://flapi.nicovideo.jp/api/getthreadkey';
  static postKeyUrl = 'http://flapi.nicovideo.jp/api/getpostkey';
  static requestCount = 0;
  static packetCount = 0;

  constructor(request, execute = true) {
    this.request = request;
    this.latest = {};

    if (execute) {
      return this.execute();
    }
  }

  async execute() {
    // リクエストを検証
    this.requestValidation();

    // スレッドキーを取得
    if (this.request.isNeedsKey) {
      await this.fetchThreadKey();
    }

    // 最新のスレッドを取得
    await this.fetchLatestThread();

    // ポストキーを取得
    await this.fetchPostKey();

    // コメントを投稿
    const chatResult = await this.postChat();

    // 投稿したコメントをポーリング
    const postedPacket = await this.fetchPostedChat();

    // 投稿したコメントを取得
    const postedChat = postedPacket.chat.find(chat => chat.no === chatResult.no);

    // プレイヤーへ送る
    return this.createDispatchRequest(postedChat, postedPacket);
  }

  get getBlockNo() {
    return Math.floor(this.latest.thread.last_res / 100);
  }

  get getLastRes() {
    return getIn(this, 'latest.thread.last_res') || -1;
  }

  createPostJSON() {
    return this.createPacket('packet', [
      {
        chat: {
          content: this.latest.comment,
          thread: this.request.threadId,
          vpos: this.request.vpos,
          mail: Array.from(this.latest.command).join(' ').trim(),
          postkey: this.latest.postKey,
          premium: this.request.isPremium,
          ticket: this.latest.thread.ticket,
          user_id: this.request.userId
        }
      }
    ]);
  }

  createFetchJSON() {
    let thread = {
      language: 0,
      nicoru: 0,
      res_from: this.getLastRes,
      scores: 1,
      thread: this.request.threadId,
      user_id: this.request.userId,
      version: 20061206,
      with_global: 1
    };

    if (this.request.isNeedsKey) {
      thread = Object.assign({}, thread, this.latest.threadSecret);

    } else if (this.request.hasOwnProperty('userKey')) {
      thread = Object.assign({}, thread, {
        userkey: this.request.userKey
      });
    }

    return this.createPacket('packet', [
      { thread }
    ]);
  }

  createDispatchRequest(postedChat, postedPacket) {
    const thread = postedPacket.thread[0];

    const request = {
      video: {
        comment: thread.last_res
      },

      chat: {
        thread: Number(postedChat.thread),
        no: postedChat.no,
        vpos: postedChat.vpos,
        date: postedChat.date,
        date_usec: postedChat.date_usec,
        anonymity: postedChat.anonymity,
        user_id: postedChat.user_id,
        content: postedChat.content,
        mail: postedChat.hasOwnProperty('mail') ? postedChat.mail.split(' ') : [],
        score: postedChat.hasOwnProperty('score') ? postedChat.score : 0,
        deleted: postedChat.hasOwnProperty('deleted') ? postedChat.deleted : 0,
        fork: postedChat.hasOwnProperty('fork'),
        post: true
      }
    };

    return request;
  }

  requestValidation() {
    const commentValidation = new ValidateChat.comment(this.request);
    const commandValidation = new ValidateChat.command(this.request);

    this.latest.comment = commentValidation.execute();
    this.latest.command = commandValidation.execute();
  }

  createPacket(type, items) {
    let start, finish;

    switch (type) {
      case 'request':
        start = `rs:${PostChat.requestCount}`;
        finish = `rf:${PostChat.requestCount}`;
        break;

      case 'packet':
        start = `ps:${PostChat.packetCount}`;
        finish = `pf:${PostChat.packetCount}`;
        break;
    }

    const result = [
      {
        ping: { content: start }
      },
      ...items,
      {
        ping: { content: finish }
      }
    ];

    PostChat[`${type}Count`]++;

    return result;
  }

  async fetchThreadKey() {
    const url = new URL(PostChat.threadKeyUrl);
    const formData = new FormData();
    formData.append('thread', this.request.threadId);

    // Cookieも送らないと正確なキーがもらえない
    const response = await fetch(url, {
      method: 'post',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      return Promise.reject(new Error('HTTP Error'));
    }

    const responseText = await response.text();
    const threadSecret = Utils.decodeURLParams(responseText);

    if (!threadSecret.threadkey.length) {
      return Promise.reject(new Error('Thread key is empty'));
    }

    this.latest.threadSecret = threadSecret;

    return Promise.resolve(threadSecret);
  }

  async fetchPostKey() {
    const url = new URL(PostChat.postKeyUrl);
    const params = {
      thread: this.request.threadId,
      block_no: this.getBlockNo,
      device: 1,
      version: 1,
      version_sub: 1
    };

    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.append(key, value)
    );

    const response = await fetch(url, {
      credentials: 'include'
    });

    if (!response.ok) {
      return Promise.reject(new Error('HTTP Error'));
    }

    const responseText = await response.text();
    const postKey = responseText.split('=').pop();

    if (!postKey.length) {
      return Promise.reject(new Error('PostKey is empty'));
    }

    this.latest.postKey = postKey;

    return Promise.resolve(postKey);
  }

  async fetchThread(body) {
    const url = new URL(this.request.serverUrl);
    url.pathname = '/api.json/';

    const response = await fetch(url, {
      method: 'post',
      body: JSON.stringify(
        this.createPacket('request', body)
      )
    });

    const packetArray = await response.json();

    return Promise.resolve(this.formatPacket(packetArray));
  }

  async postChat() {
    const postBody = this.createPostJSON();
    const packet = await this.fetchThread(postBody);
    const chatResult = packet.chat_result[0];

    ValidateChat.threadResult('post', chatResult.status);

    this.latest.thread.last_res = chatResult.no;

    return Promise.resolve({
      no: chatResult.no,
      threadId: chatResult.thread
    });
  }

  async fetchLatestThread() {
    const postBody = this.createFetchJSON();
    const packet = await this.fetchThread(postBody);
    const thread = packet.thread[0];

    ValidateChat.threadResult('fetch', thread.resultcode);

    this.latest.thread = thread;

    return Promise.resolve(packet);
  }

  // 投稿したコメントがすぐに返ってこない時があるので仕方なくポーリングする
  async fetchPostedChat() {
    let pollingCount = 0;

    console.group('Polling start');

    const packet = await new Promise((resolve, reject) => {
      const polling = () => {
        this.fetchLatestThread().then(packet => {
          if (packet.hasOwnProperty('chat')) {
            const hasChat = packet.chat.some(chat => (
              chat.thread === this.latest.thread.thread &&
              chat.no === this.latest.thread.last_res
            ));

            if (hasChat) {
              console.log('found!');
              clearInterval(intervalId);
              resolve(packet);
            }
          }
        });

        if (++pollingCount > 20) {
          clearInterval(intervalId);
          reject(new Error('No chat response'));
        } else {
          console.log('try', pollingCount);
          return polling;
        }
      }

      const intervalId = setInterval((polling)(), 500);
    });

    console.groupEnd();

    return Promise.resolve(packet);
  }

  formatPacket(packet) {
    return packet.reduce((items, item) => {
      Object.entries(item).forEach(([key, value]) => {
        if (!items.hasOwnProperty(key)) {
          items[key] = [];
        }

        items[key].push(value);
      });

      return items;
    }, {});
  }
}
