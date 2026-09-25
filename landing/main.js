// Highlight the download for the visitor's device and point the hero button at it.
(function () {
  var ua = navigator.userAgent || '';
  var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  // Phones and tablets use the web app
  var os = /android|iphone|ipad|ipod/i.test(ua)
    ? 'web'
    : /win/i.test(platform)
      ? 'windows'
      : /mac/i.test(platform)
        ? 'mac'
        : /linux/i.test(platform)
          ? 'linux'
          : 'web';

  var card = document.querySelector('.dl[data-os="' + os + '"]');
  if (card) card.classList.add('recommended');

  var names = { windows: 'Download for Windows', mac: 'Download for Mac', linux: 'Download for Linux' };
  var hero = document.getElementById('hero-download');
  if (hero && names[os] && card && card.getAttribute('href')) {
    hero.textContent = names[os];
    hero.setAttribute('href', card.getAttribute('href'));
    hero.setAttribute('rel', 'noopener');
  }
})();
