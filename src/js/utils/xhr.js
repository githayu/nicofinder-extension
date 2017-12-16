/**
 * @param {Object} request
 * @param {String} request.method
 * @param {String} request.url
 * @param {String} request.responseType
 * @param {Object} request.qs
 * @param {Object} request.headers
 * @param {Object|FormData} request.body
 * @param {Number} request.timeout
 * @param {Boolean} request.async
 * @param {Boolean} request.withCredentials
 */
export default function (request) {
  return new Promise((resolve, reject) => {
    const defaultRequest = {
      method: 'GET',
      async: true,
      withCredentials: false
    };

    const xhr = new XMLHttpRequest();
    const url = new URL(request.url);
    let formData = new FormData();

    request = Object.assign({}, defaultRequest, request);

    if (request.hasOwnProperty('qs')) {
      Object.entries(request.qs).forEach(([name, value]) =>
        url.searchParams.append(name, value)
      );
    }

    if (request.hasOwnProperty('body')) {
      const type = toString.call(request.body);

      if (type.includes('Object')) {
        Object.entries(request.body).forEach(([name, value]) =>
          formData.append(name, value)
        );
      } else {
        formData = request.body;
      }
    }

    xhr.open(request.method, url, request.async);

    if (request.hasOwnProperty('headers')) {
      Object.entries(request.headers).forEach(([name, value]) =>
        xhr.setRequestHeader(name, value)
      );
    }

    if (request.hasOwnProperty('timeout')) {
      xhr.timeout = request.timeout;
    }

    xhr.withCredentials = request.withCredentials;

    xhr.onload = () => {
      if (/^2\d{2}$/.test(xhr.status)) {
        switch (request.responseType) {
          case 'xml':
            resolve(xhr.responseXML);
            break;

          case 'json':
            resolve(JSON.parse(xhr.responseText));
            break;

          default:
            resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`XHR HTTP Error: ${xhr.status}`));
      }

      xhr.abort();
    };

    xhr.onerror = (err) => reject(new Error(err.message));

    xhr.ontimeout = () => reject(new Error('XHR Timeout'));

    xhr.send(formData);
  });
}