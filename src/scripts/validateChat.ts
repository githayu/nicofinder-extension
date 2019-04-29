import { threadFetchResultCode, threadPostResultCode } from '../constants'

export interface ValidateCommentInit {
  userId: number
  threadId: string
  comment: string
  isAllowContinuousPosts: boolean
  lastPostChat: {
    date: number
    threadId: string
    user_id: number
    body: string
  }
}

export class ValidateComment {
  constructor(public request: ValidateCommentInit) {}

  execute() {
    this.length()
    this.continuousPost()

    return this.request.comment
  }

  length() {
    const { comment } = this.request

    if (!comment.length || comment.length > 1024) {
      throw new Error('Invalid comment length')
    } else {
      return true
    }
  }

  continuousPost() {
    const {
      isAllowContinuousPosts,
      lastPostChat,
      threadId,
      userId,
      comment,
    } = this.request
    let isExit = false

    if (!isAllowContinuousPosts) {
      if (!lastPostChat) {
        return true
      }

      const add60sToLastChat = lastPostChat.date + 60
      const currentUnixTime = Math.floor(Date.now() / 1000)

      const isEqualThread = lastPostChat.threadId === threadId
      const isEqualUserId = lastPostChat.user_id === userId
      const isEqualComment = lastPostChat.body === comment

      isExit =
        isEqualThread &&
        isEqualComment &&
        isEqualUserId &&
        add60sToLastChat >= currentUnixTime
    }

    if (isExit) {
      throw new Error('Continuous post is not allowed')
    } else {
      return true
    }
  }
}

export interface ValidateCommandInit {
  command: Set<string>
  comment: string
  isAnonymity: boolean
  isNeedsKey: boolean
}

export class ValidateCommand {
  constructor(public request: ValidateCommandInit) {}

  execute() {
    this.tryAdd184()
    this.tryRemove184()

    return this.request.command
  }

  tryAdd184() {
    const { isAnonymity, command } = this.request

    // 匿名希望かつ、184無し
    if (isAnonymity && !command.has('184')) {
      command.add('184')
    }
  }

  tryRemove184() {
    const { comment, command, isNeedsKey } = this.request

    const isRemove =
      // 匿名希望かつ、コメント数が75文字を超える
      (comment.length > 75 && command.has('184')) ||
      // スレッドキーが必要な動画
      isNeedsKey

    if (isRemove) {
      command.delete('184')
    }
  }
}

export function validateThreadResult(type: string, resultCode: number) {
  let codeList = type === 'post' ? threadPostResultCode : threadFetchResultCode

  if (resultCode !== 0) {
    const code = codeList.find((item) => {
      return resultCode === item.code
    })

    if (code) {
      throw new Error(code.key)
    }
  }
}
