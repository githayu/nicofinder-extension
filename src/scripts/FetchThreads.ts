import { get, has, set } from 'lodash-es'

class FetchThreads {
  static messageServer = 'https://nmsg.nicovideo.jp/api.json/'
  static defaultQuery = {
    language: 0,
    nicoru: 0,
    scores: 1,
  }

  isPlayer: boolean
  isOwnerThread: boolean
  defaultThreadId?: string
  communityThreadId?: string
  nicosThreadId?: string
  needsKey?: boolean
  threadKey?: string
  force184?: number
  language?: number
  nicoru?: number
  scores?: number
  when?: number
  waybackkey?: string
  userId?: number
  videoDuration?: number

  constructor(request: any) {
    const {
      defaultThreadId,
      communityThreadId,
      nicosThreadId,
      needsKey,
      threadKey,
      force184,
      language,
      nicoru,
      scores,
      videoDuration,
      isPlayer,
      isOwnerThread,
      when,
      waybackkey,
      userId,
    } = Object.assign({}, FetchThreads.defaultQuery, request)

    this.isPlayer = isPlayer || false
    this.isOwnerThread = isOwnerThread || false
    this.defaultThreadId = defaultThreadId
    this.communityThreadId = communityThreadId
    this.nicosThreadId = nicosThreadId
    this.needsKey = needsKey
    this.threadKey = threadKey
    this.force184 = force184
    this.language = language
    this.nicoru = nicoru
    this.scores = scores
    this.when = when
    this.waybackkey = waybackkey
    this.userId = userId
    this.videoDuration = videoDuration
  }

  async execute() {
    const packet = this.createPacket()
    const result = await this.fetchThreads(packet)

    return result
  }

  createPacket() {
    let packet = []

    if (this.defaultThreadId) {
      if (this.isPlayer) {
        packet.push(
          this.createThread({
            thread: this.defaultThreadId,
          })
        )
        packet.push(
          this.createThreadLeaves({
            thread: this.defaultThreadId,
          })
        )
      } else if (this.isOwnerThread) {
        packet.push(
          this.createThread({
            thread: this.defaultThreadId,
            fork: 1,
            res_from: -1000,
          })
        )
      } else {
        packet.push(
          this.createThread({
            thread: this.defaultThreadId,
            res_from: -1000,
          })
        )
      }
    }

    if (this.communityThreadId) {
      if (this.isPlayer) {
        packet.push(
          this.createThread({
            thread: this.communityThreadId,
          })
        )
        packet.push(
          this.createThreadLeaves({
            thread: this.communityThreadId,
          })
        )
      } else {
        packet.push(
          this.createThread({
            thread: this.communityThreadId,
            res_from: -1000,
          })
        )
      }
    }

    if (this.nicosThreadId) {
      if (this.isPlayer) {
        packet.push(
          this.createThread({
            thread: this.nicosThreadId,
          })
        )
        packet.push(
          this.createThreadLeaves({
            thread: this.nicosThreadId,
          })
        )
      } else {
        packet.push(
          this.createThread({
            thread: this.nicosThreadId,
            res_from: -1000,
          })
        )
      }
    }

    if (this.threadKey && this.force184) {
      const { threadKey, force184 } = this

      packet = packet.map((query) => {
        return Object.entries(query).reduce<{
          [x: string]: {
            threadkey: string
            force_184: number
          }
        }>((result, [key, value]) => {
          result[key] = Object.assign({}, value, {
            threadkey: threadKey,
            force_184: force184,
          })

          return result
        }, {})
      })
    }

    return packet
  }

  async fetchThreads(packet: ReturnType<FetchThreads['createPacket']>) {
    const request = new Request(FetchThreads.messageServer, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(packet),
    })

    const response = await fetch(request)

    if (!response.ok) {
      return Promise.reject(new Error('Fetch thread error'))
    }

    const packetResult = await response.json()

    return Promise.resolve(this.formatPacket(packetResult))
  }

  createThread(options: nicovideo.Thread.Base) {
    const defaultRequest: nicovideo.Thread.Thread = {
      with_global: 1,
      version: 20090904,
    }

    if (this.waybackkey && this.when && this.userId) {
      defaultRequest.waybackkey = this.waybackkey
      defaultRequest.when = this.when
      defaultRequest.user_id = this.userId
    }

    const request = Object.assign({}, defaultRequest, options)

    return this.createPacketItem('thread', request)
  }

  createThreadLeaves(options: nicovideo.Thread.Base) {
    if (this.videoDuration === undefined) {
      return this.createPacketItem('thread_leaves', {})
    }

    const endNum = Math.ceil(this.videoDuration / 60)
    const maxChat =
      this.videoDuration < 60
        ? 100
        : this.videoDuration < 300
        ? 250
        : this.videoDuration < 600
        ? 500
        : 1000

    const defaultRequest: nicovideo.Thread.Leaves = {
      content: `0-${endNum}:100,${maxChat}`,
    }

    if (this.waybackkey && this.when) {
      defaultRequest.waybackkey = this.waybackkey
      defaultRequest.when = this.when
      defaultRequest.user_id = this.userId
    }

    const request = Object.assign({}, defaultRequest, options)

    return this.createPacketItem('thread_leaves', request)
  }

  createPacketItem(
    name: string,
    request: nicovideo.Thread.Thread | nicovideo.Thread.Leaves
  ) {
    return {
      [name]: Object.assign(
        {},
        {
          language: this.language,
          nicoru: this.nicoru,
          scores: this.scores,
        },
        request
      ),
    }
  }

  formatPacket(packetResult: nicovideo.Thread.Response.Packet[]) {
    return packetResult.reduce<
      {
        [name in ReturnType<FetchThreads['findThreadType']>]: {
          [T in keyof nicovideo.Thread.Response.Packet]: nicovideo.Thread.Response.Packet[T][]
        }
      }
    >(
      (items, item) => {
        Object.entries(item).forEach(([key, value]) => {
          const threadName = this.findThreadType(value)

          if (!has(items, [threadName, key])) {
            set(items, [threadName, key], [])
          }

          items[threadName][key].push(value)
        })

        return items
      },
      {} as any
    )
  }

  findThreadType(item: nicovideo.Thread.Response.Packet) {
    switch (item.thread) {
      case this.defaultThreadId:
        return get(item, 'fork') === 1 ? 'owner' : 'default'

      case this.communityThreadId:
        return 'community'

      case this.nicosThreadId:
        return 'nicos'

      default:
        return 'unknown'
    }
  }

  get hasDefaultThread() {
    return typeof this.defaultThreadId === 'string'
  }

  get hasCommunityThread() {
    return typeof this.communityThreadId === 'string'
  }

  get hasNicosThread() {
    return typeof this.nicosThreadId === 'string'
  }
}

export default FetchThreads
