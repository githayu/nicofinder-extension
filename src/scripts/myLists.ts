import { getNicoUserSession } from '../scripts'
import {
  fetchMyListGroupList,
  fetchMyListItems,
  addItemMyList,
  groupId,
} from './api'
import { get } from 'lodash-es'

type MyListRequest =
  | {
      type: 'fetchMyListGroupList'
    }
  | { type: 'fetchMyListItems'; payload: number }
  | {
      type: 'appendMyListItem'
      payload: {
        groupId: groupId
        watchId: string
        description: string
      }
    }

type MyListManagerResponse =
  | {
      status: true
      payload: any
    }
  | { status: false; message: string }

export async function myListManager(
  req: MyListRequest,
  sendResponse: (response: MyListManagerResponse) => void
) {
  switch (req.type) {
    case 'fetchMyListGroupList': {
      const res = await fetchMyListGroupList()
      const result: MyListManagerResponse =
        get(res, 'status') === 'ok'
          ? {
              status: true,
              payload: get(res, 'mylistgroup'),
            }
          : {
              status: false,
              message: get(res, 'error.description'),
            }

      sendResponse(result)
      break
    }

    case 'fetchMyListItems': {
      const res = await fetchMyListItems({
        groupId: req.payload,
      })
      const result: MyListManagerResponse =
        get(res, 'status') === 'ok'
          ? {
              status: true,
              payload: get(res, 'mylistitem'),
            }
          : {
              status: false,
              message: get(res, 'error.description'),
            }

      sendResponse(result)
      break
    }

    case 'appendMyListItem': {
      const userSession = await getNicoUserSession()

      if (!userSession) {
        return sendResponse({
          status: false,
          message: 'Session does not exist',
        })
      }

      const res = await addItemMyList({
        userSession,
        groupId: req.payload.groupId,
        watchId: req.payload.watchId,
        description: req.payload.description,
      })

      const isDefList = req.payload.groupId === 'defList'
      const body = isDefList
        ? get(res, 'nicovideo')
        : get(res, 'nicovideo_mylist_response')

      const result: MyListManagerResponse =
        get(body, '@status') === 'ok'
          ? {
              status: true,
              payload: true,
            }
          : {
              status: false,
              message: get(body, 'error.description'),
            }

      sendResponse(result)
      break
    }
  }
}
