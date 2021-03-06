class LocalStorage {
  [x: string]: any
  static defaultItems = ['player_setting_v2', 'comment_history']

  constructor() {
    LocalStorage.defaultItems.forEach((name) => this.update(name))
  }

  set(name: string, value: any) {
    if (!toString.call(this[name]).includes('Object')) return
    var nextValue = Object.assign({}, this[name], value)
    localStorage.setItem(name, JSON.stringify(nextValue))
  }

  push(name: string, value: any) {
    if (this[name] === null) {
      this[name] = []
    } else if (!Array.isArray(this[name])) {
      return false
    }

    this[name].push(value)
    localStorage.setItem(name, JSON.stringify(this[name]))
  }

  update(name: string) {
    if (localStorage.getItem(name) === null) {
      this[name] = null
    } else {
      this[name] = JSON.parse(localStorage[name])
    }
  }
}

export default LocalStorage
