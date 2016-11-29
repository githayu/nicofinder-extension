import 'babel-polyfill';
import assert from 'power-assert';
import { ValidateComment, ValidateCommand } from '../src/js/chatValidate';

describe('コメント投稿フォーマットテスト', () => {
  it('空白コメントは無効', () => {
    const validation = new ValidateComment('');
    assert.throws(() => validation.length(), 'Invalid comment length');
  });

  it('1024文字を超えるコメントは無効', () => {
    let comment = '';
    for (let i = 0; i < 1025; i++) comment += 'w';
    const validation = new ValidateComment(comment);
    assert.throws(() => validation.length(), 'Invalid comment length');
  });

  it('匿名希望かつ、184がない場合は184追加', () => {
    const validation = new ValidateCommand(new Set(['white']), 'テスト', true, false);

    validation.tryAdd184();
    assert.ok(validation.command.has('184'));
  });

  it('匿名希望かつ、コメント数が75文字を超える場合は184除去', () => {
    let comment = '';
    for (let i = 0; i < 76; i++) comment += 'w';
    const validation = new ValidateCommand(new Set(['white', '184']), comment, false, false);

    validation.tryRemove184();
    assert.ok(!validation.command.has('184'));
  });
});
