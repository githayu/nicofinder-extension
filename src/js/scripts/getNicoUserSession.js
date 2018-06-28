export async function getNicoUserSession() {
  return new Promise((resolve) =>
    chrome.cookies.getAll(
      {
        domain: 'nicovideo.jp',
        name: 'user_session',
      },
      (cookies) => {
        if (!cookies.length) {
          resolve(null)
        } else {
          resolve(cookies[0].value)
        }
      }
    )
  )
}
