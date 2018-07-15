// @flow

import FetchThreads from './FetchThreads'
import { fetchWaybackkey, fetchUserId, fetchThreadkey } from 'js/niconico/api'

export default async function fetchPastThreads(
  {
    groupType,
    thread,
  }: {
    groupType: string,
    thread: any,
  },
  sendResponse: (any) => void
) {
  const mainThreadId = thread[`${groupType}ThreadId`]

  // UserID
  const userId = await fetchUserId()

  // Threadkey
  if (groupType === 'community') {
    const res = await fetchThreadkey(mainThreadId)

    thread.force184 = res.force_184
    thread.threadKey = res.threadkey
  }

  // Waybackkey
  const { waybackkey } = await fetchWaybackkey({
    thread: mainThreadId,
  })

  // Threads
  const threads = await new FetchThreads({
    ...thread,
    waybackkey,
    userId,
  })

  sendResponse(threads)
}
