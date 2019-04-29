import { get } from 'lodash-es'
import { baseURL } from '../constants'
import {
  ValidateCommand,
  ValidateComment,
  ValidateCommentInit,
  validateThreadResult,
  API,
  fetchClient,
} from '.'

interface PostChatRequest {
  threadId: string
  serverUrl: string
  command: Set<string>
  comment: string
  vpos: number
  isAnonymity: boolean
  isPremium: boolean
  isNeedsKey: boolean
  userId: number
  userKey: string
  isAllowContinuousPosts: ValidateCommentInit['isAllowContinuousPosts']
  lastPostChat: ValidateCommentInit['lastPostChat']
}

export default class PostChat {
  static threadKeyUrl = baseURL.nicoapi.getThreadkey
  static postKeyUrl = baseURL.nicoapi.getPostkey
  static requestCount = 0
  static packetCount = 0

  latest: any = {}

  constructor(public request: PostChatRequest) {}

  async execute() {
    // リクエストを検証
    this.requestValidation()

    // スレッドキーを取得
    if (this.request.isNeedsKey) {
      await this.fetchThreadKey()
    }

    // 最新のスレッドを取得
    await this.fetchLatestThread()

    // ポストキーを取得
    await this.fetchPostKey()

    // コメントを投稿
    const chatResult = await this.postChat()

    if (!(chatResult && chatResult.no)) {
      return
    }

    // 投稿したコメントをポーリング
    const postedPacket = await this.fetchPostedChat()

    if (!postedPacket.chat) {
      return
    }

    // 投稿したコメントを取得
    const postedChat = postedPacket.chat.find(
      (chat: any) => chat.no === chatResult.no
    )

    // プレイヤーへ送る
    return this.createDispatchRequest(postedChat, postedPacket)
  }

  get getBlockNo() {
    return Math.floor(this.latest.thread.last_res / 100)
  }

  get getLastRes() {
    return get(this, 'latest.thread.last_res') || -1
  }

  createPostJSON() {
    return this.createPacket('packet', [
      {
        chat: {
          content: this.latest.comment,
          thread: this.request.threadId,
          vpos: this.request.vpos,
          mail: Array.from(this.latest.command)
            .join(' ')
            .trim(),
          postkey: this.latest.postKey,
          premium: Number(this.request.isPremium),
          ticket: this.latest.thread.ticket,
          user_id: String(this.request.userId),
        },
      },
    ])
  }

  createFetchJSON() {
    let thread: nicovideo.Thread.Thread = {
      language: 0,
      nicoru: 0,
      res_from: this.getLastRes,
      scores: 1,
      thread: this.request.threadId,
      user_id: this.request.userId,
      version: 20061206,
      with_global: 1,
    }

    if (this.request.isNeedsKey) {
      thread = Object.assign({}, thread, this.latest.threadSecret)
    } else if (this.request.hasOwnProperty('userKey')) {
      thread = Object.assign({}, thread, {
        userkey: this.request.userKey,
      })
    }

    return this.createPacket('packet', [{ thread }])
  }

  createDispatchRequest(postedChat: any, postedPacket: any) {
    const thread = postedPacket.thread[0]

    const request = {
      video: {
        comment: thread.last_res,
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
        mail: postedChat.hasOwnProperty('mail')
          ? postedChat.mail.split(' ')
          : [],
        score: postedChat.hasOwnProperty('score') ? postedChat.score : 0,
        deleted: postedChat.hasOwnProperty('deleted') ? postedChat.deleted : 0,
        fork: postedChat.hasOwnProperty('fork'),
        post: true,
      },
    }

    return request
  }

  requestValidation() {
    const {
      userId,
      threadId,
      command,
      comment,
      isAllowContinuousPosts,
      lastPostChat,
      isAnonymity,
      isNeedsKey,
    } = this.request

    const commentValidation = new ValidateComment({
      userId,
      threadId,
      comment,
      isAllowContinuousPosts,
      lastPostChat,
    })

    const commandValidation = new ValidateCommand({
      command,
      comment,
      isAnonymity,
      isNeedsKey,
    })

    this.latest.comment = commentValidation.execute()
    this.latest.command = commandValidation.execute()
  }

  createPacket(
    type: 'request' | 'packet',
    items: nicovideo.Thread.Request.Packet[]
  ) {
    const isReq = type === 'request'

    if (isReq) {
      PostChat.requestCount++
    } else {
      PostChat.packetCount++
    }

    const result = [
      {
        ping: {
          content: isReq
            ? `rs:${PostChat.requestCount}`
            : `ps:${PostChat.packetCount}`,
        },
      },
      ...items,
      {
        ping: {
          content: isReq
            ? `rf:${PostChat.requestCount}`
            : `pf:${PostChat.packetCount}`,
        },
      },
    ]

    return result
  }

  async fetchThreadKey() {
    const threadSecret = await API.fetchThreadkey(this.request.threadId, true)

    this.latest.threadSecret = threadSecret

    return threadSecret
  }

  async fetchPostKey() {
    const postKey = await API.fetchPostkey(
      this.request.threadId,
      this.getBlockNo,
      true
    )

    this.latest.postKey = postKey

    return postKey
  }

  async fetchThread(body: nicovideo.Thread.Request.Packet[]) {
    const url = new URL(this.request.serverUrl)
    url.pathname = '/api.json/'

    const packetArray = await fetchClient({
      viaBackground: true,
      request: {
        url: url.href,
        responseType: 'json',
        request: {
          method: 'POST',
          body: JSON.stringify(this.createPacket('request', body)),
        },
      },
    })

    return this.formatPacket(packetArray)
  }

  async postChat() {
    const postBody = this.createPostJSON()
    const packet = await this.fetchThread(postBody)
    const chatResult = packet.chat_result ? packet.chat_result[0] : undefined

    if (chatResult) {
      validateThreadResult('post', chatResult.status)

      this.latest.thread.last_res = chatResult.no

      return Promise.resolve({
        no: chatResult.no,
        threadId: chatResult.thread,
      })
    }
  }

  async fetchLatestThread() {
    const postBody = this.createFetchJSON()
    const packet = await this.fetchThread(postBody)
    const thread = packet.thread ? packet.thread[0] : undefined

    if (thread) {
      validateThreadResult('fetch', thread.resultcode)

      this.latest.thread = thread

      return packet
    }
  }

  // 投稿したコメントがすぐに返ってこない時があるので仕方なくポーリングする
  async fetchPostedChat() {
    let pollingCount = 0

    console.group('Polling start')

    const packet = await new Promise<
      {
        [T in keyof nicovideo.Thread.Response.Packet]: nicovideo.Thread.Response.Packet[T][]
      }
    >((resolve, reject) => {
      const polling = () => {
        this.fetchLatestThread().then((pkt) => {
          if (pkt && pkt.chat) {
            const hasChat = pkt.chat.some(
              (chat) =>
                !!chat &&
                chat.thread === this.latest.thread.thread &&
                chat.no === this.latest.thread.last_res
            )

            if (hasChat) {
              console.log('found!')
              clearInterval(intervalId)
              return resolve(pkt)
            }
          }
        })

        if (++pollingCount > 20) {
          clearInterval(intervalId)
          reject(new Error('No chat response'))
        } else {
          console.log('try', pollingCount)
          return polling
        }
      }

      const intervalId = setInterval(polling, 500)
    })

    console.groupEnd()

    return packet
  }

  formatPacket(packet: nicovideo.Thread.Response.Packet[]) {
    return packet.reduce<
      {
        [T in keyof nicovideo.Thread.Response.Packet]: nicovideo.Thread.Response.Packet[T][]
      }
    >((items, item) => {
      Object.entries(item).forEach(([key, value]) => {
        if (!items.hasOwnProperty(key)) {
          items[key] = []
        }

        items[key].push(value)
      })

      return items
    }, {})
  }
}
