import { decodeURLParams } from '../utils/DetailURL'

export type groupId = number | 'defList'

/**
 * waybackkeyを取得する
 */
export async function fetchWaybackkey(params: Record<string, any>) {
  const formData = Object.entries(params).reduce((fd, [key, value]) => {
    fd.append(key, value)
    return fd
  }, new FormData())

  const res = await fetch('https://flapi.nicovideo.jp/api/getwaybackkey', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  }).then((res) => res.text())

  return decodeURLParams(res)
}

/**
 * ユーザーIDの取得
 *
 * @export
 * @returns
 */
export async function fetchUserId() {
  const res = await fetch('https://public.api.nicovideo.jp/v1/user/id.json', {
    credentials: 'include',
  }).then((res) => res.json())

  return res.data?.userId
}

/**
 * Threadkeyの取得
 */
export async function fetchThreadkey(
  threadId: string | number,
  viaBackground: boolean = false
) {
  const formData = new FormData()

  formData.append('thread', String(threadId))

  // Cookieも送らないと正確なキーがもらえない
  const res = await fetch('https://flapi.nicovideo.jp/api/getthreadkey', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  }).then((res) => res.text())

  const threadSecret = decodeURLParams(res)

  if (!threadSecret.threadkey) {
    throw new Error('Thread key is empty')
  }

  return threadSecret as { threadkey: string; force_184: number }
}
