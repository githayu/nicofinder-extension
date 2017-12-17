import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import { Utils, DetailURL } from 'src/js/utils';
import styles from './Popup.module.scss';
import 'src/styles/common.scss';

class Popup extends React.Component {
  state = {
    serviceId: null,
    contentId: null,
    contentData: null,
    isRedirect: false
  }

  componentDidMount() {
    // リダイレクト状態の取得
    chrome.storage.local.get('redirect', storage => this.setState({
      isRedirect: storage.redirect
    }));

    // タブ情報の取得
    Utils.getActiveTabs()
      .then(([tab]) => {
        const detailURL = new DetailURL(tab.url);
        const serviceId = detailURL.getContentDir();
        const contentId = detailURL.getContentId();

        if (detailURL.isNiconico && serviceId !== false && contentId !== false) {
          switch (serviceId) {
            case 'watch': {
              this.backendRequest({
                type: 'fetchVideoInfo',
                payload: contentId
              })
                .then(res => {
                  if (res['@status'] !== 'ok') return;

                  this.setState({
                    serviceId,
                    contentId,
                    contentData: res
                  });
                });
              break;
            }

            default:
              this.setState({
                serviceId,
                contentId,
                contentData: null
              });
              break;
          }
        }
      });
  }

  backendRequest(req) {
    return new Promise((resolve, reject) => chrome.runtime.sendMessage(req, res => resolve(res)));
  }

  changeLocation(url) {
    Utils.getActiveTabs()
      .then(([tab]) => chrome.tabs.update(tab.id, { url }, () => window.close()));
  }

  get getThumbnailUrl() {
    const {
      contentData
    } = this.state;

    if (contentData === null) {
      return;

    } else if (contentData?.video?.options?.['@large_thumbnail'] == 1) {
      return `${contentData.video.thumbnail_url}.L`;

    } else if (contentData?.video?.thumbnail_url) {
      return contentData.video.thumbnail_url;
    }
  }

  render() {
    const {
      serviceId,
      contentId,
      contentData,
      isRedirect
    } = this.state;

    return (
      <>
        {serviceId === 'watch' && (
          <img
            src={this.getThumbnailUrl}
            alt={contentData?.video?.title}
            className={styles.thumbnail}
          />
        )}

        <nav className={styles.nav}>
          <header>
            <span>転送モード</span>
            <span
              className={[
                styles.toggle,
                isRedirect ? 'is-active' : 'is-inactive'
              ].join(' ').trim()}
              onClick={() => chrome.storage.local.set({
                redirect: !isRedirect
              }, () => this.setState({
                isRedirect: !isRedirect
              }))}
            />
          </header>

          {do {
            if (serviceId === 'watch') {
              const watchUrl = `http://www.nicofinder.net/watch/${contentId}`;
              const commentUrl = `http://www.nicofinder.net/comment/${contentId}`;

              <>
                <a
                  href={watchUrl}
                  onClick={() => this.changeLocation(watchUrl)}
                >
                  <i className="material-icons">play_circle_filled</i>
                  Nicofinderで視聴
                </a>
                <a
                  href={commentUrl}
                  target="_blank"
                >
                  <i className="material-icons">comment</i>
                  コメント解析を開く
                </a>
              </>

            } else if (serviceId === 'mylist') {
              const myListUrl = `http://www.nicofinder.net/mylist/${contentId}`;

              <a
                href={myListUrl}
                onClick={() => this.changeLocation(myListUrl)}
              >
                <i className="material-icons">open_in_new</i>
                Nicofinderで開く
              </a>
            }
          }}
        </nav>
      </>
    );
  }
}

ReactDOM.render(<Popup />, document.getElementById('app'));