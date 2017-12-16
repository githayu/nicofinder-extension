import React from 'react';
import { defaultStorage } from 'src/js/constants';
import './Options.scss';

export default class Options extends React.Component {
  static defaultProps = {
    options: [
      {
        type: 'redirect',
        title: 'リダイレクト設定',
        class: 'redirect-section',
        items: [
          {
            name: 'redirectList',
            value: 'watch',
            label: '/watch/*'
          }, {
            name: 'redirectList',
            value: 'mylist',
            label: '/mylist/*'
          }
        ]
      }
    ]
  }

  constructor() {
    super();

    this.state = {
      storage: null
    };
  }

  componentWillMount() {
    chrome.storage.local.get(defaultStorage.extension.local, storage => {
      this.setState({ storage });
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      let newStorage = {}

      for (let name in changes) {
        newStorage[name] = changes[name].newValue;
      }

      this.setState({
        storage: Object.assign({}, this.state.storage, newStorage)
      });
    });
  }

  shouldCheck(type, item) {
    const { storage } = this.state;

    switch (type) {
      case 'options': {
        return storage[item.name];
      }

      case 'redirect': {
        return storage.redirect && storage.redirectList.includes(item.value);
      }
    }
  }

  shouldDisabled(type, item) {
    const { storage } = this.state;

    if (type === 'redirect') {
      let checkList = [
        storage.redirectList.length === 1,
        storage.redirectList.includes(item.value)
      ];

      return !storage.redirect || checkList.every(i => i === true);
    } else {
      return false;
    }
  }

  onChangeHandler = e => {
    var target = e.target;
    var result = {};

    switch (target.name) {
      case 'redirectList': {
        let redirectList = Array.from(new Set(this.state.storage.redirectList));
        let index = redirectList.indexOf(target.value);

        if (target.checked && index <= 0) {
          redirectList.push(target.value);
        } else if (index >= 0) {
          redirectList.splice(index, 1);
        }

        result = { redirectList };
        break;
      }
    }

    chrome.storage.local.set(result);
  }

  renderOptions() {
    const { options } = this.props;

    if (!this.state.storage) return;

    return options.map(option =>
      <li className={option.class}>
        <h2>{option.title}</h2>

        {
          option.items.map(item =>
            <label>
              <input
                type="checkbox"
                name={item.name}
                value={item.value}
                onChange={this.onChangeHandler}
                checked={this.shouldCheck(option.type, item)}
                disabled={this.shouldDisabled(option.type, item)}
              />
              <span>{item.label}</span>
            </label>
          )
        }
      </li>
    );
  }

  render() {
    return (
      <ul styleName="options">
        {this.renderOptions()}
      </ul>
    );
  }
}