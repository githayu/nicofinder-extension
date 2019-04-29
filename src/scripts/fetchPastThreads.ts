import FetchThreads from './FetchThreads'
import { fetchWaybackkey, fetchUserId, fetchThreadkey } from './api'

export default async function fetchPastThreads(
  {
    groupType,
    thread,
  }: {
    groupType: string
    thread: any
  },
  sendResponse: any
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
  const fetchThreads = new FetchThreads({
    ...thread,
    waybackkey,
    userId,
  })

  const threads = await fetchThreads.execute()

  sendResponse(threads)
}
