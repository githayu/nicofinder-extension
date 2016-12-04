var scriptElement = document.createElement('script');
scriptElement.innerHTML = 'window.NicofinderExtension = true;';

(document.head || document.documentElement).appendChild(scriptElement);
