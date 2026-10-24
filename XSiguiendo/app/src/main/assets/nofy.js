// Oculta la pestaña "Para ti" de X y fuerza siempre "Siguiendo".
(function () {
  if (window.__noFY) return;
  window.__noFY = true;

  var FOR_YOU = /^(para ti|for you|pour vous|per te|für dich|para você|voor jou)$/i;
  var FOLLOWING = /^(siguiendo|following|abonnements|seguiti|gefolgt|seguindo|volgend)$/i;

  var style = document.createElement('style');
  style.textContent =
    '.nofy-hidden{display:none!important}' +
    // Mientras "Para ti" esté seleccionado, no se muestra su contenido.
    'html.nofy-wait [data-testid="primaryColumn"] section{visibility:hidden!important}';
  (document.head || document.documentElement).appendChild(style);

  function isHome() {
    return /^\/(home)?\/?$/.test(location.pathname);
  }

  function fix() {
    var root = document.documentElement;
    if (!isHome()) { root.classList.remove('nofy-wait'); return; }

    var col = document.querySelector('[data-testid="primaryColumn"]') || document;
    var tabs = col.querySelectorAll('[role="tablist"] [role="tab"]');
    if (!tabs.length) return;

    var forYou = null, following = null;
    for (var i = 0; i < tabs.length; i++) {
      var txt = (tabs[i].textContent || '').trim();
      if (!forYou && FOR_YOU.test(txt)) forYou = tabs[i];
      else if (!following && FOLLOWING.test(txt)) following = tabs[i];
    }
    // Si el idioma no se reconoce: en Inicio, "Para ti" siempre es la primera pestaña.
    if (!forYou && tabs.length >= 2) { forYou = tabs[0]; following = following || tabs[1]; }
    if (!forYou) return;

    var box = forYou.closest('[role="presentation"]') || forYou;
    box.classList.add('nofy-hidden');

    if (forYou.getAttribute('aria-selected') === 'true') {
      root.classList.add('nofy-wait');
      if (following) following.click();
    } else {
      root.classList.remove('nofy-wait');
    }
  }

  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; fix(); });
  }).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected']
  });
  fix();
})();
