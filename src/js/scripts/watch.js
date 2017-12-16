chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'watchInfo':
    case 'qualityChange':
      window.postMessage({
        ...msg,
        sender
      }, location.origin);
      break;
  }
});