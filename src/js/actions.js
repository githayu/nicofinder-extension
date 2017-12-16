import { createAction } from 'redux-actions';

export default {
  set: {
    watchInfo: createAction(Symbol('watchInfo'))
  },
  script: {
    watchInit: createAction('script/watchInit'),
    sessionURL: createAction('script/sessionURL'),
  }
};