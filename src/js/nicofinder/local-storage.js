export default class LocalStorage {
  static defaultItems = ['player_setting_v2', 'comment_history']

  constructor() {
    LocalStorage.defaultItems.forEach((name) => this.update(name))
  }

  set(name, value) {
    if (!toString.call(this[name]).includes('Object')) return
    var nextValue = Object.assign({}, this[name], value)
    localStorage.setItem(name, JSON.stringify(nextValue))
  }

  push(name, value) {
    if (this[name] === null) {
      this[name] = []
    } else if (!Array.isArray(this[name])) {
      return false
    }

    this[name].push(value)
    localStorage.setItem(name, JSON.stringify(this[name]))
  }

  update(name) {
    if (localStorage.getItem(name) === null) {
      this[name] = null
    } else {
      this[name] = JSON.parse(localStorage.getItem(name))
    }
  }
}
