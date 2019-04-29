import { state } from './background'
import {
  API,
  XHRCore,
  fetchCore,
  XHRCoreRequest,
  FetchCoreRequest,
  getNicoUserSession,
} from '../scripts'

type ProxyRequest =
  | {
      type: 'backgroundFetch'
      payload: FetchCoreRequest
    }
  | { type: 'backgroundXHR'; payload: XHRCoreRequest }
  | { type: 'fetchVideoInfo'; payload: any }
  | { type: 'getUserSession' }
  | {
      type: 'notification'
      data: chrome.notifications.NotificationOptions
    }

const BackgroundProxy = (
  request: ProxyRequest,
  sender: chrome.runtime.MessageSender,
  sendResponse: any
) => {
  switch (request.type) {
    case 'backgroundFetch': {
      fetchCore(request.payload)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            error: true,
            message: err.message,
          })
        )

      return true
    }

    case 'backgroundXHR': {
      XHRCore(request.payload)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({
            error: true,
            message: err.message,
          })
        )

      return true
    }

    case 'fetchVideoInfo': {
      API.fetchVideoInfo(request.payload).then((res) => {
        state.videoInfo = res.nicovideo_video_response
        sendResponse(res.nicovideo_video_response)
      })

      return true
    }

    case 'getUserSession': {
      getNicoUserSession().then(sendResponse)

      return true
    }

    case 'notification': {
      return chrome.notifications.create(request.data, (notificationId) => {
        setTimeout(() => chrome.notifications.clear(notificationId), 5000)
      })
    }
  }
}

export default BackgroundProxy
