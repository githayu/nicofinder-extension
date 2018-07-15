// @flow

import React from 'react'
import ReactDOM from 'react-dom'
import { defaultStorage } from 'js/config'
import styles from './Options.module.scss'
import '../../styles/common.scss'

type Props = {
  options: {
    type: string,
    title: string,
    class: string,
    items: {
      name: string,
      value: string,
      label: string,
    }[],
  }[],
}

type State = {
  storage: {},
}

export default class Options extends React.Component<Props, State> {
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
            label: '/watch/*',
          },
          {
            name: 'redirectList',
            value: 'mylist',
            label: '/mylist/*',
          },
        ],
      },
    ],
  }

  state = {
    storage: null,
  }

  constructor() {
    super()

    chrome.storage.local.get(defaultStorage.extension.local, (storage) => {
      this.setState({ storage })
    })

    chrome.storage.onChanged.addListener((changes) => {
      let newStorage = {}

      for (let name in changes) {
        newStorage[name] = changes[name].newValue
      }

      this.setState({
        storage: Object.assign({}, this.state.storage, newStorage),
      })
    })
  }

  shouldCheck(type, item) {
    const { storage } = this.state

    switch (type) {
      case 'options': {
        return storage[item.name]
      }

      case 'redirect': {
        return storage.redirect && storage.redirectList.includes(item.value)
      }
    }
  }

  shouldDisabled(type, item) {
    const { storage } = this.state

    if (type === 'redirect') {
      let checkList = [
        storage.redirectList.length === 1,
        storage.redirectList.includes(item.value),
      ]

      return !storage.redirect || checkList.every((i) => i === true)
    } else {
      return false
    }
  }

  onChangeHandler = (e) => {
    var target = e.target
    var result = {}

    switch (target.name) {
      case 'redirectList': {
        let redirectList = Array.from(new Set(this.state.storage.redirectList))
        let index = redirectList.indexOf(target.value)

        if (target.checked && index <= 0) {
          redirectList.push(target.value)
        } else if (index >= 0) {
          redirectList.splice(index, 1)
        }

        result = { redirectList }
        break
      }
    }

    chrome.storage.local.set(result)
  }

  renderOptions() {
    const { options } = this.props

    if (!this.state.storage) return

    return options.map((option) => (
      <li className={option.class} key={`options-${option.type}`}>
        <h2>{option.title}</h2>

        {option.items.map((item) => (
          <label key={`options-item-${item.name}`}>
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
        ))}
      </li>
    ))
  }

  render() {
    return <ul className={styles.options}>{this.renderOptions()}</ul>
  }
}

ReactDOM.render(<Options />, document.getElementById('app'))
