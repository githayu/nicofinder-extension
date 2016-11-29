import {
  threadFetchResultCode,
  threadPostResultCode
} from './config';

export class ValidateComment {
  constructor(comment) {
    this.comment = comment;
  }

  execute() {
    this.length();

    return this.comment;
  }

  length() {
    if (!this.comment.length || this.comment.length > 1024) {
      throw new Error('Invalid comment length');
    } else {
      return true;
    }
  }
}


export class ValidateCommand {
  constructor(command, comment, isAnonymity, isNeedsKey) {
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
    const isRemove = [
      // 匿名希望かつ、コメント数が75文字を超える
      this.comment.length > 75 && this.command.has('184') ||
      // スレッドキーが必要な動画
      this.isNeedsKey
    ];

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
