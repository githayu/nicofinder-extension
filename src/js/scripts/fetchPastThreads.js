import _ from 'lodash'
import FetchThreads from './FetchThreads'
import { fetchWaybackkey, fetchUserId } from 'src/js/niconico/api'

export default async function fetchPastThreads(req, sendResponse) {
  const userId = await fetchUserId()

  const { waybackkey } = await fetchWaybackkey({
    thread: do {
      if (req.groupType === 'default') req.thread.defaultThreadId
      else if (req.groupType === 'community') req.thread.communityThreadId
      else if (req.groupType === 'nicos') req.thread.nicosThreadId
    },
  })

  const threads = await new FetchThreads({
    ...req.thread,
    waybackkey,
    userId,
  })

  sendResponse(threads)
}
