import React from 'react'
import ReactDOM from 'react-dom'
import { getActiveTabs, DetailURL } from '../scripts'
import { baseURL } from '../constants'
import { get } from 'lodash-es'
import MUI from './MUI'
import styled, { createGlobalStyle } from 'styled-components'
import { Switch } from '@material-ui/core'

interface State {
  serviceId?: any
  contentId?: any
  contentData?: nicovideo.API.VideoInfo['nicovideo_video_response']
  isRedirect: boolean
  redirectList: string[]
}

const changeLocation = (url: string) => {
  getActiveTabs().then(([tab]) => {
    if (tab.id === undefined) return
    chrome.tabs.update(tab.id, { url }, () => window.close())
  })
}

const Popup = () => {
  const [state, setState] = React.useState<State>({
    serviceId: undefined,
    contentId: undefined,
    contentData: undefined,
    isRedirect: false,
    redirectList: [],
  })

  React.useEffect(() => {
    // リダイレクト状態の取得
    chrome.storage.local.get(['redirect', 'redirectList'], (storage) =>
      setState({
        ...state,
        ...storage,
      })
    )

    // タブ情報の取得
    getActiveTabs().then(([tab]) => {
      if (!tab.url) {
        return
      }

      const detailURL = new DetailURL(tab.url)
      const serviceId = detailURL.getContentDir()
      const contentId = detailURL.getContentId()

      if (detailURL.isNiconico && serviceId && contentId) {
        switch (serviceId) {
          case 'watch': {
            chrome.runtime.sendMessage(
              {
                type: 'fetchVideoInfo',
                payload: contentId,
              },
              (res: nicovideo.API.VideoInfo['nicovideo_video_response']) => {
                if (res['@status'] !== 'ok') return

                setState({
                  ...state,
                  serviceId,
                  contentId,
                  contentData: res,
                })
              }
            )
            break
          }

          default:
            setState({
              ...state,
              serviceId,
              contentId,
              contentData: undefined,
            })
            break
        }
      }
    })
  }, [])

  const getThumbnailUrl = React.useCallback(() => {
    const { contentData } = state

    if (!contentData) {
      return undefined
    }

    if (get(contentData, 'video.options.@large_thumbnail') == 1) {
      return `${contentData.video.thumbnail_url}.L`
    } else if (get(contentData, 'video.thumbnail_url')) {
      return contentData.video.thumbnail_url
    }
  }, [state.contentData])

  let lists = null

  if (state.serviceId === 'watch') {
    const watchUrl = `${baseURL.nicofinder.top}/watch/${state.contentId}`
    const commentUrl = `${baseURL.nicofinder.top}/comment/${state.contentId}`

    lists = (
      <>
        <a href={watchUrl} onClick={() => changeLocation(watchUrl)}>
          <i className="material-icons">play_circle_filled</i>
          Nicofinderで視聴
        </a>
        <a href={commentUrl} target="_blank" rel="noopener noreferrer">
          <i className="material-icons">comment</i>
          コメント解析を開く
        </a>
      </>
    )
  } else if (state.serviceId === 'mylist') {
    const myListUrl = `${baseURL.nicofinder.top}/mylist/${state.contentId}`

    lists = (
      <a href={myListUrl} onClick={() => changeLocation(myListUrl)}>
        <i className="material-icons">open_in_new</i>
        Nicofinderで開く
      </a>
    )
  }

  return (
    <>
      {state.serviceId === 'watch' && state.contentData && (
        <Thumbnail
          src={getThumbnailUrl()}
          alt={state.contentData.video.title}
        />
      )}

      <Nav>
        <header>
          <span>転送モード</span>
          <Switch
            checked={state.isRedirect}
            onChange={() =>
              chrome.storage.local.set(
                {
                  redirect: !state.isRedirect,
                },
                () =>
                  setState({
                    ...state,
                    isRedirect: !state.isRedirect,
                  })
              )
            }
          />
        </header>

        {lists}
      </Nav>
    </>
  )
}

const GlobalStyle = createGlobalStyle`
  #app {
    display: flex;
    background-color: #e8e8e8;
  }
`

const Thumbnail = styled.img`
  flex: 0 0 178px;
  width: 178px;
  height: 100px;
  object-fit: cover;
  margin: 8px;
  border-radius: 2px;
`

const Nav = styled.nav`
  padding: 0;
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  background-color: #f8f8f8;
  width: 100%;
  min-width: 200px;
  box-shadow: 0 -1px 2px rgba(0, 0, 0, 0.3);

  > header {
    line-height: 4rem;
    padding: 0 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #fff;
  }

  > a {
    text-decoration: none;
    line-height: 3.2rem;
    padding: 0 16px;
    color: #303030;
    font-size: 1.3rem;
    outline: none;

    &:first-of-type {
      border-top: 1px #e0e0e0 solid;
    }

    &:hover {
      background-color: #e8e8e8;

      .material-icons {
        color: #303030;
      }
    }

    .material-icons {
      color: #c0c0c0;
      font-size: 1.6rem;
      vertical-align: text-top;
      margin-right: 8px;
    }
  }
`

const Toggle = styled.span`
  width: 32px;
  height: 12px;
  background-image: linear-gradient(
    to right,
    var(--accent-color-1) 32px,
    #c0c0c0 32px
  );
  background-size: 64px auto;
  background-position: -32px 0;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease-out;

  &::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    background-color: #fff;
    border-radius: 50%;
    top: calc(50% - 9px);
    left: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    transition: inherit;
  }

  &.is-active {
    background-position: 0;

    &::before {
      transform: translateX(calc(100% - 4px));
      background-color: var(--primary-color-1);
    }
  }
`

ReactDOM.render(
  <MUI>
    <GlobalStyle />
    <Popup />
  </MUI>,
  document.getElementById('app')
)
