import _ from 'lodash';

export { default as getDirectory } from './getDirectory';
export { default as XMLToJS } from './xmlTo';
export { default as XHR } from './xhr';

export function getActiveTabs() {
  return new Promise(resolve => chrome.tabs.query({
    active: true,
    currentWindow: true
  }, resolve));
}

export function decodeURLParams(paramsString) {
  const searchParams = new URLSearchParams(paramsString);

  const resultParams = Array.from(searchParams).reduce((result, [key, value]) => {
    result[key] = this.isDecimalNumber(value) ? Number(value) : value;
    return result;
  }, {});

  return resultParams;
}

/**
 *
 * @param {Object} options
 * @param {string} options.url
 * @param {string} options.responseType
 * @param {Object} options.request
 */
export async function fetchClient(options) {
  const url = new URL(options.url);

  if (_.has(options, 'qs')) {
    Object.entries(options.qs).forEach(([name, value]) =>
      url.searchParams.append(name, value)
    );
  }

  if (_.has(options, 'request.body') && _.isPlainObject(options.request.body)) {
    const formData = new FormData();

    Object.entries(options.request.body).forEach(([name, value]) =>
      formData.append(name, value)
    );

    options.request.body = formData;
  }

  const response = await fetch(url, options.request);

  if (!response.ok) {
    return Promise.reject(new Error('Fetch Error'));
  }

  return await response[options.responseType]();
}