import { handleActions } from 'redux-actions';
import actions from 'js/actions';

const initState = {
  watchInfo: null
};

export default handleActions({
  [actions.set.watchInfo]: (state, action) => ({
    ...state,
    watchInfo: action.payload
  })
}, initState);