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
    var m = location.pathname.match(/\/status\/(\d+)/);
    return m ? m[1] : null;
  }

  // Vídeo "grande" en pantalla = estamos en el visor de vídeos.
  function bigVideo() {
    var vids = document.getElementsByTagName('video');
    var W = window.innerWidth, H = window.innerHeight;
    for (var i = 0; i < vids.length; i++) {
      var r = vids[i].getBoundingClientRect();
      if (r.width >= W * 0.95 && r.height >= H * 0.35 &&
          r.bottom > H * 0.3 && r.top < H * 0.7) return vids[i];
    }
    return null;
  }

  function videoMode() {
    if (/\/(video|videos)\b/.test(location.pathname)) return true;
    if (document.querySelector('[aria-modal="true"] video, [role="dialog"] video')) return true;
    return !!bigVideo();
  }

  var locked = [], wasVideo = false, startId = null, badge = null, enteredAt = 0;
  // Durante el primer segundo X coloca el vídeo abierto: se deja y se memoriza esa posición.
  function settling() { return Date.now() - enteredAt < 1000; }

  function lockScroll() {
    var v = bigVideo() || document.querySelector('[aria-modal="true"] video, [role="dialog"] video');
    var els = [document.documentElement, document.body];
    for (var p = v && v.parentElement; p; p = p.parentElement) els.push(p);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el || el.__nofyLocked) continue;
      el.__nofyLocked = { o: el.style.overflowY, t: el.style.touchAction, s: el.scrollTop };
      el.style.setProperty('overflow-y', 'hidden', 'important');
      el.style.setProperty('touch-action', 'pan-x pinch-zoom', 'important');
      locked.push(el);
    }
  }

  function unlockScroll() {
    for (var i = 0; i < locked.length; i++) {
      var el = locked[i], s = el.__nofyLocked;
      if (!s) continue;
      el.style.overflowY = s.o;
      el.style.touchAction = s.t;
      el.__nofyLocked = null;
    }
    locked = [];
  }

  function showBadge(on) {
    if (!badge) {
      badge = document.createElement('div');
      badge.style.cssText = 'position:fixed;top:4px;right:8px;z-index:2147483647;' +
        'background:rgba(0,0,0,.6);color:#4FC3F7;font:11px sans-serif;padding:2px 6px;' +
        'border-radius:8px;pointer-events:none;';
      document.documentElement.appendChild(badge);
    }
    badge.textContent = '🔒 ' + location.pathname.slice(0, 40);
    badge.style.display = on ? 'block' : 'none';
  }

  function checkVideo() {
    var now = videoMode();
    if (now && !wasVideo) { startId = statusId(); enteredAt = Date.now(); }
    if (now) {
      lockScroll();
      // Mantiene la posición de todo lo bloqueado.
      for (var i = 0; i < locked.length; i++) {
        var el = locked[i], s = el.__nofyLocked;
        if (!s) continue;
        if (settling()) s.s = el.scrollTop;
        else if (Math.abs(el.scrollTop - s.s) > 2) el.scrollTop = s.s;
      }
      // Si X ha cambiado a otro post, vuelve al vídeo que abriste.
      var id = statusId();
      if (startId && id && id !== startId) { startId = null; history.back(); }
    } else if (wasVideo) {
      unlockScroll();
    }
    wasVideo = now;
    showBadge(now);
  }

  // Bloquea los deslizamientos verticales en el visor (decide en el primer movimiento).
  var sx = 0, sy = 0, gesture = 0; // 0 sin decidir, 1 vertical (bloqueado), 2 horizontal
  window.addEventListener('touchstart', function (e) {
    gesture = 0;
    if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
    if (videoMode()) checkVideo();
  }, { capture: true, passive: true });
  window.addEventListener('touchmove', function (e) {
    if (e.touches.length !== 1 || !wasVideo) return;
    if (gesture === 0) {
      var dx = Math.abs(e.touches[0].clientX - sx), dy = Math.abs(e.touches[0].clientY - sy);
      gesture = dx > dy ? 2 : 1;
    }
    if (gesture === 1) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, { capture: true, passive: false });
  ['pointermove', 'touchend'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (!wasVideo || gesture !== 1) return;
      if (type === 'pointermove' && e.pointerType !== 'touch') return;
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, { capture: true, passive: true });
  });

  // Si algo se desplaza en el visor, lo devuelve a su sitio al momento.
  document.addEventListener('scroll', function (e) {
    if (!wasVideo) return;
    var el = e.target === document ? document.scrollingElement : e.target;
    var s = el && el.__nofyLocked;
    if (!s) return;
    if (settling()) s.s = el.scrollTop;
    else if (Math.abs(el.scrollTop - s.s) > 2) el.scrollTop = s.s;
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
