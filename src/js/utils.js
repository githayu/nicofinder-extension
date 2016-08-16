import { regExp } from './config';

export const getActiveTabs = () => {
  return new Promise(resolve => chrome.tabs.query({
    active: true,
    currentWindow: true
  }, resolve));
}

export const validateURL = (url, options) => {
  if (options === undefined) return false;
  return url.match(regExp[options.domain][options.name]);
};

export const isDecimalNumber = string => /^(?!0)\d+$/.test(string);

export const xhr = request => {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest(),
        url = new URL(request.url);

    request = Object.assign({}, {
      method: 'get',
      formData: new FormData()
    }, request);

    if ('qs' in request) {
      switch (request.method) {
        case 'get': {
          Object.entries(request.qs).forEach(([name, value]) => url.searchParams.append(name, value));
          break;
        }

        case 'post': {
          Object.entries(request.qs).forEach(([name, value]) => request.formData.append(name, value));
          break;
        }
      }
    }

    xhr.open(request.method, url, true);

    if (request.timeout) xhr.timeout = request.timeout;

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 304) {
        switch (request.type) {
          case 'xml':
            resolve(xhr.responseXML);
            break;

          case 'text':
            resolve(xhr.responseText);
            break;

          case 'json':
            resolve(JSON.parse(xhr.responseText));
            break;
        }
      } else {
        reject({
          status: false,
          code: xhr.status
        });
      }

      xhr.abort();
    }

    xhr.onerror = e => reject({
      status: false,
      code: 'native',
      detail: e
    });

    xhr.ontimeout = () => reject({
      status: false,
      code: 'timeout'
    });

    xhr.send(request.formData);
  });
};

export const xmlChildrenParser = collections => {
  var currentData = {};

  for (let children of collections) {
    let attributes = {};

    // 属性
    if (children.attributes.length) {
      for (let attribute of children.attributes) {
        let value = isDecimalNumber(attribute.value) ? Number(attribute.value) : attribute.value;
        attributes[attribute.name] = value;
      }
    }

    // 子要素
    if (children.children.length) {
      let deepData = Object.assign({}, xmlChildrenParser(children.children), attributes);

      // 複数の同名タグが存在
      if (Array.from(collections).filter(element => element.tagName === children.tagName).length > 1) {
        if (children.tagName in currentData === false) currentData[children.tagName] = [];
        currentData[children.tagName].push(deepData);
      } else {
        currentData[children.tagName] = Object.assign({}, currentData[children.tagName], deepData);
      }
    } else {
      let value = isDecimalNumber(children.innerHTML) ? Number(children.innerHTML) : children.innerHTML;
      currentData[children.tagName] = value;
    }
  }

  return currentData;
};
