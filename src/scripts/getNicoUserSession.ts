export async function getNicoUserSession(): Promise<string | undefined> {
  return new Promise((resolve) =>
    chrome.cookies.getAll(
      {
        domain: 'nicovideo.jp',
        name: 'user_session',
      },
      (cookies) => {
        if (!cookies.length) {
          resolve()
        } else {
          resolve(cookies[0].value)
        }
      }
    )
  )
}
