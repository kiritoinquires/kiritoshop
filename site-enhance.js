/* CYRUS SHOP — shared front-end polish layer.
 * Spawns the floating particle field (CSS for .cyrus-particle ships in
 * assets/css/cyrus-polish.css via glass-theme.css) and adds drag-to-scroll
 * / swipe momentum to any horizontally scrolling row on the page. */
(function () {
  'use strict';

  function spawnParticles(count) {
    if (document.getElementById('cyrus-particles')) return;
    var wrap = document.createElement('div');
    wrap.id = 'cyrus-particles';
    wrap.setAttribute('aria-hidden', 'true');
    var n = count || (window.innerWidth < 640 ? 14 : 24);
    for (var i = 0; i < n; i++) {
      var dot = document.createElement('div');
      dot.className = 'cyrus-particle';
      var duration = (16 + Math.random() * 18).toFixed(1);
      var delay = (-Math.random() * 30).toFixed(1);
      dot.style.left = (Math.random() * 100).toFixed(2) + '%';
      dot.style.animationDuration = duration + 's';
      dot.style.animationDelay = delay + 's';
      wrap.appendChild(dot);
    }
    document.body.insertBefore(wrap, document.body.firstChild);
  }

  /* Generic drag-to-scroll: works for any existing horizontally-scrolling
   * row (category chips, quick-access icons, flash-sale rails, galleries)
   * without needing to know each page's class names up front. Native touch
   * scrolling is left untouched; this adds smooth mouse-drag + a small
   * release-inertia so swiping feels the same on desktop and mobile. */
  function enhanceSwipeRows() {
    var rows = document.querySelectorAll('[data-swipe], .carousel-track');
    var candidates = document.querySelectorAll('*');
    var seen = new Set();

    function consider(el) {
      if (seen.has(el)) return;
      var style = window.getComputedStyle(el);
      if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 8) {
        seen.add(el);
        attachDrag(el);
      }
    }

    rows.forEach(consider);
    candidates.forEach(function (el) {
      if (el.children.length && el.scrollWidth > el.clientWidth + 8) consider(el);
    });
  }

  function attachDrag(el) {
    if (el.dataset.swipeReady) return;
    el.dataset.swipeReady = '1';
    el.classList.add('cyrus-swipe');

    var isDown = false, moved = false, startX = 0, startScroll = 0;
    var lastX = 0, lastT = 0, velocity = 0;
    var raf = null;

    function cancelMomentum() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    function momentum() {
      if (Math.abs(velocity) < 0.02) { raf = null; return; }
      el.scrollLeft -= velocity * 16;
      velocity *= 0.94;
      raf = requestAnimationFrame(momentum);
    }

    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return; // native touch scroll stays native
      isDown = true; moved = false;
      cancelMomentum();
      startX = e.clientX; startScroll = el.scrollLeft;
      lastX = e.clientX; lastT = performance.now();
      el.classList.add('is-dragging');
    });

    window.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;

      var now = performance.now();
      var dt = now - lastT || 16;
      velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastT = now;
    });

    window.addEventListener('pointerup', function () {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('is-dragging');
      if (moved) {
        raf = requestAnimationFrame(momentum);
        var onClickCapture = function (ev) { ev.preventDefault(); ev.stopPropagation(); el.removeEventListener('click', onClickCapture, true); };
        el.addEventListener('click', onClickCapture, true);
      }
    });
  }

  function init() {
    spawnParticles();
    enhanceSwipeRows();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
