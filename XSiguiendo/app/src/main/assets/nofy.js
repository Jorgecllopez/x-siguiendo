// Oculta la pestaña "Para ti" de X y fuerza siempre "Siguiendo".
(function () {
  if (window.__noFY) return;
  window.__noFY = true;

  var FOR_YOU = /^(para ti|for you|pour vous|per te|für dich|para você|voor jou)$/i;
  var FOLLOWING = /^(siguiendo|following|abonnements|seguiti|gefolgt|seguindo|volgend)$/i;

  function hide(el) {
    // Estilo en línea: no lo bloquea la política de seguridad de X.
    el.style.setProperty('display', 'none', 'important');
  }

  function isHome() {
    return /^\/(home)?\/?$/.test(location.pathname);
  }

  // Busca el elemento "pestaña" a partir de un texto visible.
  function findByText(re) {
    // Primero dentro de las barras de pestañas; si no hay, en toda la página.
    var nodes = document.querySelectorAll('[role="tablist"] span, [role="tablist"] div, [role="tablist"] a');
    if (!nodes.length) nodes = document.querySelectorAll('nav span, header span, [role="tab"] span');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.children.length > 1) continue;
      var t = (n.textContent || '').trim();
      if (t.length > 20 || !re.test(t)) continue;
      var tab = n.closest('[role="tab"], a[href="/home"], [role="presentation"]');
      if (tab) return tab;
    }
    return null;
  }

  function isSelected(tab) {
    if (tab.getAttribute('aria-selected') === 'true') return true;
    var inner = tab.querySelector('[aria-selected="true"]');
    return !!inner;
  }

  function fix() {
    if (!isHome()) return;

    var forYou = findByText(FOR_YOU);
    var following = findByText(FOLLOWING);

    // Idioma no reconocido: en Inicio, "Para ti" es siempre la primera pestaña.
    if (!forYou) {
      var tabs = document.querySelectorAll('[role="tablist"] [role="tab"]');
      if (tabs.length >= 2) { forYou = tabs[0]; following = following || tabs[1]; }
    }
    if (!forYou) return;

    var tabEl = forYou.matches('[role="tab"]') ? forYou : (forYou.querySelector('[role="tab"]') || forYou);
    var box = forYou.closest('[role="presentation"]') || forYou;

    if (isSelected(tabEl) || isSelected(box)) {
      var target = following && (following.matches('[role="tab"], a') ? following
                   : (following.querySelector('[role="tab"], a') || following));
      if (target) target.click();
    }
    hide(box);
  }

  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    setTimeout(function () { queued = false; fix(); }, 50);
  }).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected']
  });
  setInterval(fix, 700);
  fix();
})();
