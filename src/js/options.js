import chrome from './initialize';
import React from 'react';
import ReactDOM from 'react-dom';
import { defaultStorage } from './config';

class CommentHistory extends React.Component {
  componentWillMount() {
    chrome.storage.local.get(defaultStorage.extension.local, storage => this.setState({
      chromeLocalStorage: storage
    }));

    chrome.storage.onChanged.addListener((changes, namespace) => {
      for (let name in changes) {
        this.setState({
          chromeLocalStorage: Object.assign({}, this.state.chromeLocalStorage, {
            [name]: changes[name].newValue
          })
        })
      }
    });
  }

  render() {
    if (this.state === null) {
      return (
        <div />
      );
    };

    return (
      <ul className="options">
        <li>
          <h2>オプション</h2>
          <label>
            <input
              type="checkbox"
              name="recordCommentHistory"
              onChange={e => chrome.storage.local.set({
                recordCommentHistory: e.target.checked
              })}
              defaultChecked={this.state.chromeLocalStorage.recordCommentHistory}
            />
            <span>コメント履歴を記録する</span>
          </label>
        </li>

        <li>
          <h2>リダイレクト設定</h2>
          <label>
            <input
              type="checkbox"
              name="redirect"
              value="watch"
              onChange={::this.redirectListUpdater}
              defaultChecked={this.redirectListCheck('watch')}
            />
            <span>{'/watch/*'}</span>
          </label>
          <label>
            <input
              type="checkbox"
              name="redirect"
              value="mylist"
              onChange={::this.redirectListUpdater}
              defaultChecked={this.redirectListCheck('mylist')}
            />
            <span>{'/mylist/*'}</span>
          </label>
        </li>
      </ul>
    )
  }

  redirectListUpdater(e) {
    var redirectList = Array.from(new Set(this.state.chromeLocalStorage.redirectList)),
        index = redirectList.indexOf(e.target.value);

    if (e.target.checked && index <= 0) {
      redirectList.push(e.target.value);
    } else if (index >= 0) {
      redirectList.splice(index, 1);
    }

    chrome.storage.local.set({ redirectList });
  }

  redirectListCheck(name) {
    return this.state.chromeLocalStorage.redirectList.length === 0 &&
           this.state.chromeLocalStorage.redirect ||
           this.state.chromeLocalStorage.redirectList.includes(name);
  }
}

ReactDOM.render(
  <CommentHistory />,
  document.getElementById('app')
);
