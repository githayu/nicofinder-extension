import _ from 'lodash';
import {NicoAPI} from 'js/api/';

const dmcSessionRegExp = /\/\/api\.dmc\.nico(?::[0-9]+)?\/api\/sessions(?:\?.+)?$/;
const thumbWatchRegExp = /\/\/ext\.nicovideo\.jp\/thumb_watch\//;
const nMsgRegExp = /\/\/nmsg\.nicovideo\.jp\/api\.json\/$/;

const COMMENT_NG_SHARE_LIMIT = {
  high: -1000,
  medium: -4800,
  low: -10000
};

function qualityChange(name, items, sender) {
  const videoQuality = sessionStorage.getItem(name);

  if (videoQuality) {
    const index = items.indexOf(videoQuality);

    if (index !== -1) {
      items.unshift(...items.splice(index, 1));
    } else {
      sessionStorage.removeItem(name);
    }
  }

  return items;
}

// Fetch Proxy
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (_.get(msg, 'type') !== 'fetchProxy') return;

  const {
    payload: { url, request }
  } = msg;

  if (dmcSessionRegExp.test(url)) {
    const body = JSON.parse(request.body);
    const watchId = body.session.recipe_id.split('-').pop();

    NicoAPI.fetchWatchHTML({ watchId })
      .then(watchDocument => {
        const dataElement = watchDocument.getElementById('js-initial-watch-data');

        if (!dataElement) return;

        const watchInfo = JSON.parse(dataElement.dataset.apiData);

        const {
          audios,
          player_id,
          content_key_timeout,
          priority,
          service_user_id,
          signature,
          token,
          videos
        } = watchInfo.video.dmcInfo.session_api;

        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'watchInfo',
          payload: watchInfo
        });

        _.chain(body.session)
          .set('client_info.player_id', player_id)
          .set('content_auth.service_user_id', service_user_id)
          .set('content_auth.content_key_timeout', content_key_timeout)
          .set('content_src_id_sets[0].content_src_ids[0].src_id_to_mux', {
            audio_src_ids: qualityChange('audioQuality', audios, sender),
            video_src_ids: qualityChange('videoQuality', videos, sender)
          })
          .set('priority', priority)
          .set('session_operation_auth.session_operation_auth_by_signature', {
            signature,
            token
          })
          .value();

        sendResponse({
          url,
          request: {
            ...request,
            body: JSON.stringify(body)
          }
        });
      });

  } else if (thumbWatchRegExp.test(url)) {
    const watchId = new URL(url).pathname.split('/').pop();

    NicoAPI.fetchWatchHTML({ watchId })
      .then(() => NicoAPI.fetchFlvInfo({
        qs: {
          v: watchId,
          is_https: sender.url.startsWith('https') ? 1 : 0
        },
        decode: false
      }))
      .then(res => sendResponse({
        url: `data:text/plain;base64,${window.btoa(res)}`,
        request
      }));

  } else if (nMsgRegExp.test(url)) {
    const commentLang = sessionStorage.getItem('commentLanguage');
    const commentNGShareLevel = sessionStorage.getItem('commentNGShareLevel');
    let body = request.body;

    if (commentLang !== null) {
      const newBody = JSON.parse(request.body).map(packet => {
        if (packet.thread && !packet.thread.fork) {
          return _.merge({}, packet, {
            thread: {
              language: commentLang
            }
          });

        } else if (packet.thread_leaves) {
          return _.merge({}, packet, {
            thread_leaves: {
              language: commentLang
            }
          });

        } else {
          return packet;
        }
      });

      body = JSON.stringify(newBody);
    }

    if (commentNGShareLevel) {
      fetch(url, {
        ...request,
        body
      })
        .then(res => res.json())
        .then(res => {
          let packets = res;

          const limit = COMMENT_NG_SHARE_LIMIT[commentNGShareLevel];

          packets = res.reduce((chats, item) => {
            if (item.chat && item.chat.score) {
              if (item.chat.score >= limit) {
                chats.push(item);
              }
            } else {
              chats.push(item);
            }

            return chats;
          }, []);

          const content = window.btoa(unescape(encodeURIComponent(JSON.stringify(packets))));

          sendResponse({
            url: `data:application/json;base64,${content}`,
            request
          });
        });

    } else {
      sendResponse({
        url,
        request: {
          ...request,
          body
        }
      });
    }

  } else {
    sendResponse({ url, request });
  }

  return true;
});