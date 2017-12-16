import { eventChannel } from 'redux-saga';
import { takeEvery, take, put, fork, call } from 'redux-saga/effects';
import actions from 'js/actions';
import { NicoAPI } from 'js/api/';

function* externalEventListener() {
  const channel = yield eventChannel(emitter => {
    const onMessage = (action, sender, sendResponse) => {
      emitter({
        action,
        sender,
        sendResponse
      });

      return true;
    };

    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  });

  while (true) {
    const event = yield take(channel);

    switch (event.action.type) {
      case `${actions.script.watchInit}`: {
        yield call(watchInit, event);
        break;
      }

      default: {
        yield put(event.action);
        break;
      }
    }
  }
}

function* watchInit({ action: { payload: watch }, sendResponse }) {
  const watchDocument = yield call(NicoAPI.fetchWatchHTML, {
    watchId: watch.videoId
  });

  const dataElement = watchDocument.getElementById('js-initial-watch-data');

  if (!dataElement) return;

  const apiData = JSON.parse(dataElement.dataset.apiData);

  // console.log(watch,sender,apiData);

  // const {
  //   audios,
  //   content_id: contentId,
  //   content_key_timeout: contentKeyTimeout,
  //   protocols,
  //   service_user_id: serviceUserId,
  //   videos,
  //   signature: watchApiSignature
  // } = apiData.video.dmcInfo.session_api;

  // const content = {
  //   audios,
  //   contentId,
  //   contentKeyTimeout,
  //   protocols,
  //   serviceUserId,
  //   videos,
  //   watchApiSignature
  // };

  yield put(actions.set.watchInfo(apiData));
}

export default function* () {
  yield fork(externalEventListener);
}