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
