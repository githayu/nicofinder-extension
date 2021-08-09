import { isNil, isNull, set } from 'lodash-es'
import { SetRequired } from 'type-fest'

type Value = string | number

export type Fields = Partial<Record<string, Value>>
export type Records = Partial<Record<string, Fields[]>>
export type Packets = Partial<Record<string, Records>>

export type FetchThreadRequest = {
  defaultId?: Value
  communityId?: Value
  nicosId?: Value
  needsKey?: number
  threadKey?: string
  force184?: number
  language?: number
  nicoru?: number
  scores?: number
  duration?: number
  isPlayer?: boolean
  isOwner?: boolean
  isEasy?: boolean
  resFrom?: number
  version?: number
  server?: string
  waybackkey?: string
  when?: number
  userId?: number
}

export class FetchThreads {
  static endpoint = 'https://nmsg.nicovideo.jp/api.json'
  static endpoint2 = 'https://nvcomment.nicovideo.jp/legacy/api.json'

  static defaultQuery = {
    language: 0,
    nicoru: 0,
    scores: 1,
    resFrom: -1000,
    version: 20090904,
  }

  req: SetRequired<
    FetchThreadRequest,
    'language' | 'nicoru' | 'scores' | 'resFrom' | 'version' | 'server'
  >

  constructor(req: FetchThreadRequest) {
    const res = { ...FetchThreads.defaultQuery, ...req }

    this.req = {
      resFrom: res.resFrom,
      version: res.version,
      isPlayer: res.isPlayer ?? false,
      isOwner: res.isOwner ?? false,
      defaultId: res.defaultId,
      communityId: res.communityId,
      nicosId: res.nicosId,
      needsKey: res.needsKey,
      threadKey: res.threadKey,
      force184: res.force184,
      language: res.language,
      nicoru: res.nicoru,
      scores: res.scores,
      duration: res.duration,
      isEasy: req.isEasy,
      server: req.server ? `${req.server}/api.json` : FetchThreads.endpoint,
      waybackkey: req.waybackkey,
      when: req.when,
      userId: req.userId,
    }
  }

  async execute() {
    const packet = this.createPacket()
    const result = await this.fetchThreads(packet)

    return result
  }

  createPacket() {
    const {
      isPlayer,
      defaultId,
      isOwner,
      communityId,
      nicosId,
      needsKey,
      isEasy,
      resFrom,
    } = this.req

    let packet = []

    if (this.hasDefaultId && defaultId) {
      if (isPlayer) {
        packet.push(
          this.createThread({
            thread: defaultId,
            fork: isEasy ? 2 : 0,
          })
        )
        packet.push(
          this.createThreadLeaves({
            thread: defaultId,
            fork: isEasy ? 2 : 0,
          })
        )
      } else if (isOwner) {
        packet.push(
          this.createThread({
            thread: defaultId,
            fork: 1,
            res_from: resFrom,
          })
        )
      } else {
        packet.push(
          this.createThread({
            thread: defaultId,
            fork: isEasy ? 2 : 0,
            res_from: resFrom,
          })
        )
      }
    }

    if (this.hasCommunityId && communityId) {
      if (isPlayer) {
        packet.push(
          this.createThread({
            thread: communityId,
            fork: isEasy ? 2 : 0,
          })
        )
        packet.push(
          this.createThreadLeaves({
            thread: communityId,
            fork: isEasy ? 2 : 0,
          })
        )
      } else {
        packet.push(
          this.createThread({
            thread: communityId,
            res_from: resFrom,
            fork: isEasy ? 2 : 0,
          })
        )
      }
    }

    if (this.hasNicosId && nicosId) {
      if (isPlayer) {
        packet.push(
          this.createThread({
            thread: nicosId,
            fork: isEasy ? 2 : 0,
          })
        )
        packet.push(
          this.createThreadLeaves({
            thread: nicosId,
            fork: isEasy ? 2 : 0,
          })
        )
      } else {
        packet.push(
          this.createThread({
            thread: nicosId,
            res_from: resFrom,
            fork: isEasy ? 2 : 0,
          })
        )
      }
    }

    if (needsKey) {
      const { threadKey, force184 } = this.req

      if (threadKey && force184) {
        packet = packet.map((query) =>
          Object.entries(query).reduce<
            Record<string, Record<string, string | number | undefined>>
          >((result, [key, value]) => {
            result[key] = {
              ...value,
              threadkey: threadKey,
              force_184: force184,
            }

            return result
          }, {})
        )
      }
    }

    return packet
  }

  async fetchThreads(
    packet: Record<number, Record<string, string | number | undefined>>[],
    format = true
  ) {
    const request = new Request(this.req.server, {
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

    const result: Packets = format
      ? this.formatPacket(packetResult)
      : packetResult

    return result
  }

  createThread(options: Record<string, string | number>) {
    const request: Record<string, string | number> = {
      with_global: 1,
      version: this.req.version,
      ...options,
    }

    if (this.req.waybackkey && this.req.when && this.req.userId) {
      request.waybackkey = this.req.waybackkey
      request.when = this.req.when
      request.user_id = this.req.userId
    }

    return this.createPacketItem('thread', request)
  }

  createThreadLeaves(options: Record<string, string | number>) {
    const { duration } = this.req

    if (!duration) return {}

    const endNum = Math.ceil(duration / 60)
    const maxChat =
      duration < 60 ? 100 : duration < 300 ? 250 : duration < 600 ? 500 : 1000

    const content = `0-${endNum}:100,${maxChat},nicoru:100`
    const request: Record<string, string | number> = { content, ...options }

    if (this.req.waybackkey && this.req.when && this.req.userId) {
      request.waybackkey = this.req.waybackkey
      request.when = this.req.when
      request.user_id = this.req.userId
    }

    return this.createPacketItem('thread_leaves', request)
  }

  createPacketItem(name: string, request: Record<string, string | number>) {
    const { language, nicoru, scores } = this.req

    return {
      [name]: {
        language,
        nicoru,
        scores,
        ...request,
      },
    }
  }

  formatPacket(
    packetResult: Record<string, Record<string, string | number>>[]
  ) {
    return packetResult.reduce<Packets>((items, item) => {
      Object.entries(item).forEach(([key, value]) => {
        const threadName = this.findThreadType(value)

        if (!items?.[threadName]?.[key]) {
          set(items, [threadName, key], [])
        }

        items[threadName]?.[key]?.push(value)
      })

      return items
    }, {})
  }

  findThreadType(item: Fields) {
    const { defaultId, communityId, nicosId } = this.req

    switch (item.thread?.toString()) {
      case defaultId?.toString():
        return item?.fork === 1
          ? 'owner'
          : item?.fork === 2
          ? 'easy'
          : 'default'

      case communityId?.toString():
        return 'community'

      case nicosId?.toString():
        return 'nicos'

      default:
        return 'unknown'
    }
  }

  get hasDefaultId() {
    return !isNil(this.req.defaultId)
  }

  get hasCommunityId() {
    return !isNull(this.req.communityId)
  }

  get hasNicosId() {
    return !isNil(this.req.nicosId)
  }

  createGetUrl(xml = false) {
    const url = new URL(xml ? 'api/thread' : 'api.json/thread', this.req.server)

    const params = new URLSearchParams()

    const threadId = this.req.nicosId
      ? this.req.nicosId
      : this.req.communityId
      ? this.req.communityId
      : this.req.defaultId

    if (!threadId) return

    Object.entries({
      thread: threadId,
      version: this.req.version,
      nicoru: this.req.nicoru,
      scores: this.req.scores,
      with_global: 1,
      fork: this.req.isOwner ? 1 : this.req.isEasy ? 2 : 0,
      language: this.req.language,
      res_from: -1000,
      ...(this.req.needsKey
        ? { threadkey: this.req.threadKey, force_184: this.req.force184 }
        : {}),
    }).forEach(([key, value]) => value && params.append(key, value.toString()))

    url.search = params.toString()

    return url
  }
}
