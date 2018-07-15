import { getNicoUserSession } from 'js/scripts'
import {
  fetchMyListGroupList,
  fetchMyListItems,
  addItemMyList,
} from 'js/niconico/api'

export async function myListManager(req, sendResponse) {
  switch (req.type) {
    case 'fetchMyListGroupList': {
      const res = await fetchMyListGroupList()
      const result = {
        status: res?.status === 'ok',
      }

      if (result.status) {
        result.payload = res?.mylistgroup
      } else {
        result.message = res?.error?.description
      }

      sendResponse(result)
      break
    }

    case 'fetchMyListItems': {
      const res = await fetchMyListItems({
        groupId: req.payload,
      })
      const result = {
        status: res?.status === 'ok',
      }

      if (result.status) {
        result.payload = res?.mylistitem
      } else {
        result.message = res?.error?.description
      }

      sendResponse(result)
      break
    }

    case 'appendMyListItem': {
      const res = await addItemMyList({
        groupId: req.payload.groupId,
        watchId: req.payload.watchId,
        description: req.payload.description,
        userSession: await getNicoUserSession(),
      })

      const isDefList = req.payload.groupId === 'defList'
      const body = isDefList ? res?.nicovideo : res?.nicovideo_mylist_response
      const result = {
        status: body?.['@status'] === 'ok',
      }

      if (result.status) {
        result.payload = true
      } else {
        result.message = body?.error?.description
      }

      sendResponse(result)
      break
    }
  }
}
