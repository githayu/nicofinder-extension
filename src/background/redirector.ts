import { state } from './background'
import { DetailURL } from '../scripts'
import { baseURL } from '../constants'

export const handleBeforeRequest = (
  details: chrome.webRequest.WebRequestBodyDetails
) => {
  if (!state.storage.redirect || !details.initiator || !details.url) {
    return
  }

  const initiatorURL = new DetailURL(details.initiator)

  if (initiatorURL.isNicofinder) {
    return
  }

  let redirectRequest = {
    url: details.url,
    isRedirect: false,
  }

  // 移動後のURLを確認
  const toURL = new DetailURL(details.url)
  const contentDir = toURL.getContentDir()
  const contentId = toURL.getContentId()

  if (
    toURL.url &&
    toURL.isNicovideo &&
    contentDir &&
    contentId &&
    toURL.hasDir(...state.storage.redirectList)
  ) {
    let redirectURL = new URL(baseURL.nicofinder.top)

    redirectURL.pathname = `${contentDir}/${contentId}`

    redirectRequest = Object.assign({}, redirectRequest, {
      isRedirect: true,
      redirectUrl: redirectURL.href,
    })
  }

  state.redirectMap.set(details.requestId, redirectRequest)
}

export const handleHeadersReceived = (
  details: chrome.webRequest.WebResponseHeadersDetails
) => {
  if (!state.storage.redirect) {
    return
  }

  let redirectRequest = state.redirectMap.get(details.requestId)

  if (redirectRequest && redirectRequest.isRedirect) {
    return {
      redirectUrl: redirectRequest.redirectUrl,
    }
  }

  state.redirectMap.delete(details.requestId)
}
