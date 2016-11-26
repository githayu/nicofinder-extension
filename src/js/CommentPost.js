import getIn from 'lodash.get';

import {
  ValidateComment,
  ValidateCommand,
  validateThreadResult
} from './ChatValidate';

export default class CommentPost {
  static postKeyUrl = 'http://flapi.nicovideo.jp/api/getpostkey';
  static requestCount = 0;
  static packetCount = 0;

  constructor(thread, req, execute = true) {
    this.thread = thread;
    this.req = req;
    this.latest = {};

    if (execute) {
      return this.execute();
    }
  }

  async execute() {
    // リクエストを検証
    this.requestValidation();

    // 最新のスレッドを取得
    await this.fetchLatestThread();

    // ポストキーを取得
    await this.fetchPostKey();

    // コメントを投稿
    await this.postComment();

    // 投稿したコメントを取得
    const packet = await this.fetchLatestThread();

    // プレイヤーへ送る
    return this.createDispatchRequest(packet);
  }

  get getBlockNo() {
    return Math.floor(this.latest.thread.last_res / 100);
  }

  get getLastRes() {
    return getIn(this, 'latest.thread.last_res') || -1;
  }

  get getPostRequest() {
    return this.threadWrapper('packet', [
      {
        chat: {
          content: this.latest.comment,
          thread: this.thread.ids.default,
          vpos: this.req.vpos,
          mail: Array.from(this.latest.command).join(' '),
          postkey: this.latest.postKey,
          premium: this.req.isPremium,
          ticket: this.latest.thread.ticket,
          user_id: this.req.userId
        }
      }
    ]);
  }

  get getLatestRequest() {
    const thread = {
      language: 0,
      nicoru: 0,
      res_from: this.getLastRes,
      scores: 1,
      thread: this.thread.ids.default,
      user_id: this.req.userId,
      userkey: this.req.userKey,
      version: 20061206,
      with_global: 1
    };

    if (this.req.hasOwnProperty('userKey')) {
      thread.userkey = this.req.userKey;
    }

    return this.threadWrapper('packet', [
      { thread }
    ]);
  }

  createDispatchRequest(packet) {
    document.querySelector('.player-comment-input').value = '';

    const thread = Array.from(packet.thread).shift();
    const chat = Array.from(packet.chat).shift();

    const request = {
      video: {
        comment: thread.last_res
      },

      chat: {
        thread: Number(chat.thread),
        no: chat.no,
        vpos: chat.vpos,
        date: chat.date,
        date_usec: chat.date_usec,
        anonymity: chat.anonymity,
        user_id: chat.user_id,
        content: chat.content,
        mail: chat.mail.split(' '),
        score: chat.hasOwnProperty('score') ? chat.score : 0,
        deleted: chat.hasOwnProperty('deleted') ? chat.deleted : 0,
        fork: chat.hasOwnProperty('fork'),
        post: true
      }
    };

    return request;
  }

  requestValidation() {
    const commentValidation = new ValidateComment(this.req.comment).execute();
    const commandValidation = new ValidateCommand(this.req).execute();

    this.latest.comment = commentValidation;
    this.latest.command = commandValidation;
  }

  threadWrapper(type, item) {
    let start, finish;

    switch (type) {
      case 'request':
        start = `rs:${CommentPost.requestCount}`;
        finish = `rf:${CommentPost.requestCount}`;
        break;

      case 'packet':
        start = `ps:${CommentPost.packetCount}`;
        finish = `pf:${CommentPost.packetCount}`;
        CommentPost.packetCount++;
    }

    const result = [
      {
        ping: { content: start }
      },
      ...item,
      {
        ping: { content: finish }
      }
    ];

    CommentPost[`${type}Count`]++;

    return result;
  }

  async fetchPostKey() {
    const url = new URL(CommentPost.postKeyUrl);
    const params = {
      thread: this.thread.ids.default,
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

    if (!response.ok) return Promise.reject('Status error!');

    const responseText = await response.text();
    const postKey = responseText.split('=').pop();

    if (!postKey.length) return Promise.reject('PostKey error!');

    this.latest.postKey = postKey;
  }

  async fetchThread(body) {
    const url = new URL(this.thread.serverUrl);

    url.pathname = '/api.json/';

    const response = await fetch(url, {
      method: 'post',
      body: JSON.stringify(this.threadWrapper('request', body))
    });

    const packetArray = await response.json();

    return this.formatPacket(packetArray);
  }

  async postComment() {
    const postBody = this.getPostRequest;
    const packet = await this.fetchThread(postBody);
    const chatResult = Array.from(packet.chat_result).shift();

    validateThreadResult('post', chatResult.status);

    this.latest.thread.last_res = chatResult.no;

    return packet;
  }

  async fetchLatestThread() {
    const postBody = this.getLatestRequest;
    const packet = await this.fetchThread(postBody);
    const thread = Array.from(packet.thread).shift();

    validateThreadResult('fetch', thread.resultcode);

    this.latest.thread = thread;

    return packet;
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
