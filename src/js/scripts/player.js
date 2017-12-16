import _ from 'lodash';

const fetchProxy = document.createElement('script');

const HOFetch = function() {
  const nativeFetch = fetch;
  const id = PRODUCTION ? 'jgnhfelllimcnjaoofphfjiepgfkdbed' : 'lhkjphjhlgldeecemdaipocogjgocnhe';

  window.fetch = (url, request) => {
    return new Promise(resolve => chrome.runtime.sendMessage(id, {
      type: 'fetchProxy',
      payload: { url, request }
    }, (res) => {
      if (typeof res === 'object' && res.hasOwnProperty('url')) {
        resolve(nativeFetch(res.url, res.request));

      } else {
        resolve(res);
      }
    }));
  };
};

fetchProxy.innerHTML = `(${HOFetch})()`;

const iconLink = document.createElement('link');
iconLink.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
iconLink.rel = 'stylesheet';

const observer = new MutationObserver(mutations => mutations.forEach(mutation => {
  if (mutation.type === 'childList') {
    mutation.addedNodes.forEach(node => {
      if (node.tagName === 'HEAD') {
        node.appendChild(fetchProxy);
        node.appendChild(iconLink);

      } else if (node.id === 'ext-player') {
        let props = JSON.parse(node.dataset.props);

        props = {
          ...props,
          jsApiEnable: window != window.parent,
          showAds: false,
          playOption: {
            ...props.playOption,
            noShare: true,
            noTags: true,
            noVideoDetail: true,
            noHeader: true,
            noRelatedVideo: true
          }
        };

        node.dataset.props = JSON.stringify(props);

      }
    });
  }
}));

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

function createMetadataChangeResponse(data) {
  return {
    eventName: 'playerMetadataChange',
    playerId: 'main',
    data
  };
}

window.addEventListener('message', (e) => {
  if (!_.hasIn(e, 'data.eventName')) return;

  switch (e.data.eventName) {
    case 'commentChange': {
      const commentButton = document.querySelector('button[data-title=コメントを表示], button[data-title=コメントを非表示]');

      if (!commentButton) return;

      commentButton.click();

      e.source.postMessage(createMetadataChangeResponse({
        comment: commentButton.dataset.title !== 'コメントを表示'
      }), e.origin);
      break;
    }

    case 'playbackRateChange': {
      const video = document.querySelector('video');

      video.playbackRate = e.data.data;

      e.source.postMessage(createMetadataChangeResponse({
        playbackRate: video.playbackRate
      }), e.origin);
      break;
    }
  }
});