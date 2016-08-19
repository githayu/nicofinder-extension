import Vue from 'vue';
import { defaultStorage } from './config';

var app = new Vue({
  el: '#app',
  data: {
    storage: null,
    options: [
      {
        type: 'options',
        title: '設定',
        class: 'options-section',
        items: [
          {
            name: 'recordCommentHistory',
            label: 'コメント履歴を記録する'
          }
        ]
      }, {
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
  },
  methods: {
    updater(e) {
      var target = e.target,
          result = {};

      switch (target.name) {
        case 'recordCommentHistory': {
          result = {
            recordCommentHistory: target.checked
          };
          break;
        }

        case 'redirectList': {
          let redirectList = Array.from(new Set(this.storage.redirectList)),
              index = redirectList.indexOf(target.value);

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
    },

    checker(type, item) {
      if (!this.storage) return false;

      switch (type) {
        case 'options': {
          return this.storage[item.name];
        }

        case 'redirect': {
          return this.storage.redirect && this.storage.redirectList.includes(item.value) || this.storage.redirectList.length === 0;
        }
      }
    }
  },

  created() {
    chrome.storage.local.get(defaultStorage.extension.local, storage => {
      this.storage = storage;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
      for (let name in changes) {
        this.storage = Object.assign({}, this.storage, {
          [name]: changes[name].newValue
        });
      }
    });
  }
});
