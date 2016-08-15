import NicoAPI from './nicoAPI';

window.addEventListener('fetchRequestVideoInfo', async e => {
  var nicoAPI = new NicoAPI(e.detail),
      getflv = await nicoAPI.getflv(),
      abort = false;

  var dispatch = (type, data) => {
    window.dispatchEvent(new CustomEvent('extensionFetchResponse', {
      detail: { type, data }
    }));
  }

  if (getflv.closed === 1) {
    dispatch('getflv', getflv);
  } else {
    await nicoAPI.watch()
    .then(res => dispatch('getflv', getflv))
    .catch(e => {
      dispatch('error', e);
      abort = true;
    });

    if (abort) return;

    if (getflv.is_premium === 1) {
      await nicoAPI.storyboard(getflv.url)
      .then(res => dispatch('storyboard', res))
      .catch(e => {
        console.warn(e);
      });
    }
  }
});
