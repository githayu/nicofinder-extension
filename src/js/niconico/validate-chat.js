import {
  threadFetchResultCode,
  threadPostResultCode
} from '../config';

export class ValidateComment {
  constructor(request) {
    const {
      threadId,
      userId,
      comment,
      isAllowContinuousPosts,
      lastPostChat
    } = request;

    this.userId = userId;
    this.threadId = threadId;
    this.comment = comment;
    this.isAllowContinuousPosts = isAllowContinuousPosts;
    this.lastPostChat = lastPostChat;
  }

  execute() {
    this.length();
    this.continuousPost();

    return this.comment;
  }

  length() {
    if (!this.comment.length || this.comment.length > 1024) {
      throw new Error('Invalid comment length');
    } else {
      return true;
    }
  }

  continuousPost() {
    let isExit = false;

    if (!this.isAllowContinuousPosts) {
      if (!this.lastPostChat) {
        return true;
      }

      const add60sToLastChat = this.lastPostChat.date + 60;
      const currentUnixTime = Math.floor(Date.now() / 1000);

      const isEqualThread = this.lastPostChat.threadId === this.thread;
      const isEqualUserId = this.lastPostChat.user_id === this.userId;
      const isEqualComment = this.lastPostChat.body === this.comment;

      isExit = (
        isEqualThread &&
        isEqualComment &&
        isEqualUserId &&
        add60sToLastChat >= currentUnixTime
      );
    }

    if (isExit) {
      throw new Error('Continuous post is not allowed');
    } else {
      return true;
    }
  }
}


export class ValidateCommand {
  constructor(request) {
    const {
      command,
      comment,
      isAnonymity,
      isNeedsKey
    } = request;

    this.command = command;
    this.comment = comment;
    this.isAnonymity = isAnonymity;
    this.isNeedsKey = isNeedsKey;
  }

  execute() {
    this.tryAdd184();
    this.tryRemove184();

    return this.command;
  }

  tryAdd184() {
    // 匿名希望かつ、184無し
    if (this.isAnonymity && !this.command.has('184')) {
      this.command.add('184');
    }
  }

  tryRemove184() {
    const isRemove = (
      // 匿名希望かつ、コメント数が75文字を超える
      this.comment.length > 75 && this.command.has('184') ||
      // スレッドキーが必要な動画
      this.isNeedsKey
    );

    if (isRemove) {
      this.command.delete('184');
    }
  }
}


export function validateThreadResult(type, resultCode) {
  let codeList = (type === 'post') ? threadPostResultCode : threadFetchResultCode;

  if (resultCode !== 0) {
    const code = codeList.find(item => {
      return resultCode === item.code;
    });

    throw new Error(code.key);
  }
}
