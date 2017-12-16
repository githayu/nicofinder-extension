import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import loggerMiddleware from 'redux-logger';
import _ from 'lodash';

import { reducer, middleware } from 'js/backend/';
import 'js/backend/webRequest';

const sagaMiddleware = createSagaMiddleware();

export const store = createStore(
  reducer,
  applyMiddleware(
    sagaMiddleware,
    loggerMiddleware
  )
);

sagaMiddleware.run(middleware);

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (!_.has(msg, 'type')) return;

  switch (msg.type) {
    case 'mount':
      if (_.isPlainObject(msg.payload)) {
        Object.entries(msg.payload).forEach(([requestType, value]) => {
          switch (requestType) {
            case 'commentNGShareLevel': {
              sessionStorage.setItem(requestType, value);
              break;
            }
          }
        });
      }

      sendResponse(msg.payload);
      break;

    case 'videoQualityChange':
    case 'audioQualityChange':
    case 'commentLanguageChange':
    case 'commentNGShareLevelChange': {
      const name = msg.type.replace('Change', '');

      if (msg.payload === null) {
        sessionStorage.removeItem(name);
      } else {
        sessionStorage.setItem(name, msg.payload);
      }

      sendResponse({
        [name]: msg.payload
      });
      break;
    }
  }
});