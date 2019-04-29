declare namespace nicovideo.Thread {
  namespace Response {
    interface Packet {
      [x: string]: any
      ping?: Ping
      thread?: Thread
      leaf?: Leaf
      global_num_res?: Globalnumres
      chat?: Chat
      chat_result?: ChatResult
    }
  }

  namespace Request {
    interface Packet {
      [x: string]: any
      thread?: Thread
      thread_leaves?: Leaves
      chat?: Chat
      ping?: Ping
    }
  }

  interface Base {
    [x: string]: any
    thread?: string
    waybackkey?: string
    when?: number
    user_id?: number
    res_from?: number
    fork?: number
    threadkey?: string
    force_184?: number
    language?: number
    nicoru?: number
    scores?: number
  }

  interface Thread extends Base {
    with_global?: number
    version?: number
    result_code?: number
  }

  interface Leaves extends Base {
    content?: string
  }
}

interface ChatResult {
  thread: string
  status: number
  no: number
}

interface Chat {
  thread?: string
  no?: number
  vpos?: number
  leaf?: number
  date?: number
  date_usec?: number
  anonymity?: number
  user_id?: string
  mail?: string
  content?: string
  premium?: number
  score?: number
  deleted?: number
  ticket?: string
  postkey?: string
}

interface Globalnumres {
  thread: string
  num_res: number
}

interface Leaf {
  thread: string
  count: number
  leaf?: number
}

interface ThreadResponse {
  resultcode: number
  thread: string
  server_time: number
  last_res: number
  ticket: string
  revision: number
}

interface Ping {
  content: string
}
