import 'babel-polyfill';
import assert from 'power-assert';
import { ValidateChat } from '../src/js/niconico/';

describe('コメント投稿フォーマットテスト', () => {
  it('空白コメントは無効', () => {
    const validation = new ValidateChat.comment({
      comment: ''
    });

    assert.throws(() => validation.length(), 'Invalid comment length');
  });

  it('1024文字を超えるコメントは無効', () => {
    let comment = ''; for (let i = 0; i < 1025; i++) comment += 'w';

    const validation = new ValidateChat.comment({ comment });

    assert.throws(() => validation.length(), 'Invalid comment length');
  });

  it('連続投稿を無効にしている場合、1分以内の同じコメントは無効', () => {
    const request = {
      threadId: 1479988050,
      comment: 'わぁー',
      userId: 16418073,
      isAllowContinuousPosts: false,
      lastPostChat: {
        body: 'わぁー',
        date: ~~ (Date.now() / 1000) - 60,
        mail: [],
        no: 2525,
        vpos: 2525,
        user_id: 16418073,
        thread: 1479988050
      }
    };

    const validation = new ValidateChat.comment(request);

    assert.throws(() => validation.continuousPost(), /Continuous post is not allowed/);
  });

  it('連続投稿を許可している場合', () => {
    const request = {
      comment: '㌧！',
      isAllowContinuousPosts: true
    };

    const validation = new ValidateChat.comment(request);

    assert.ok(validation.continuousPost());
  });

  it('匿名希望かつ、184がない場合は184追加', () => {
    const request = {
      command: new Set(['white']),
      comment: 'テスト',
      isAnonymity: true,
      isNeedsKey: false
    };

    const validation = new ValidateChat.command(request);

    validation.tryAdd184();

    assert.ok(validation.command.has('184'));
  });

  it('匿名希望かつ、コメント数が75文字を超える場合は184除去', () => {
    let comment = ''; for (let i = 0; i < 76; i++) comment += 'w';

    const request = {
      command: new Set(['white', '184']),
      comment: comment,
      isAnonymity: false,
      isNeedsKey: false
    };

    const validation = new ValidateChat.command(request);

    validation.tryRemove184();

    assert.ok(!validation.command.has('184'));
  });
});
