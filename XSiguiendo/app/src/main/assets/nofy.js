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
    checkVideo();
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

  // ---------- Vídeos: ver el que abres, pero sin pasar al siguiente ----------

  function statusId() {
    var m = location.pathname.match(/\/status\/(\d+)\/video\//);
    return m ? m[1] : null;
  }

  function videoMode() {
    if (statusId()) return true;
    return !!document.querySelector('[aria-modal="true"] video, [role="dialog"] video');
  }

  var wasVideo = false, startId = null, enteredAt = 0, scrollSnap = new WeakMap();

  function checkVideo() {
    var now = videoMode();
    if (now && !wasVideo) {
      startId = statusId();
      enteredAt = Date.now();
      scrollSnap = new WeakMap();
    }
    wasVideo = now;
    // Si X ha conseguido cambiar a otro vídeo, vuelve al que abriste.
    if (now && startId) {
      var id = statusId();
      if (id && id !== startId) { startId = null; history.back(); }
    }
  }

  // Bloquea los deslizamientos verticales dentro del visor de vídeo.
  var sx = 0, sy = 0;
  function start(x, y) { sx = x; sy = y; }
  function isVertical(x, y) {
    var dx = Math.abs(x - sx), dy = Math.abs(y - sy);
    return dy > 6 && dy > dx;
  }
  window.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY);
  }, { capture: true, passive: true });
  window.addEventListener('touchmove', function (e) {
    if (e.touches.length !== 1 || !videoMode()) return;
    if (isVertical(e.touches[0].clientX, e.touches[0].clientY)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true, passive: false });
  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') start(e.clientX, e.clientY);
  }, { capture: true, passive: true });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'touch' || !videoMode()) return;
    if (isVertical(e.clientX, e.clientY)) e.stopPropagation();
  }, { capture: true, passive: true });

  // Tercera barrera: si algo se desplaza en el visor, lo devuelve a su sitio.
  document.addEventListener('scroll', function (e) {
    if (!videoMode()) return;
    var el = e.target === document ? document.scrollingElement : e.target;
    if (!el || typeof el.scrollTop !== 'number') return;
    if (Date.now() - enteredAt < 1200 || !scrollSnap.has(el)) {
      scrollSnap.set(el, el.scrollTop); // posición inicial del vídeo abierto
      return;
    }
    var keep = scrollSnap.get(el);
    if (Math.abs(el.scrollTop - keep) > 2) el.scrollTop = keep;
  }, { capture: true, passive: true });

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
