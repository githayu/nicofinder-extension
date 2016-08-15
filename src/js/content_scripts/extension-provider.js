var scriptElement = document.createElement('script');
scriptElement.innerHTML = 'window.NicofinderExtension = true;';

document.addEventListener('DOMContentLoaded', () => {
  document.head.appendChild(scriptElement);
});
