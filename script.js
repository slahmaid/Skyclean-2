(() => {
  const header = document.getElementById('site-header');
  const topbar = document.querySelector('.topbar');
  const toggle = header.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const closeBtn = menu.querySelector('.menu-close');
  const links = document.querySelectorAll('.nav-link, .menu-link');
  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Smooth scrolling (Lenis), off when the visitor prefers reduced motion
  const lenis = (window.Lenis && !reduced.matches)
    ? new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 1, touchMultiplier: 1.2, smoothWheel: true })
    : null;
  window.skyLenis = lenis;
  const menuBody = menu.querySelector('.menu-body');
  if (menuBody) menuBody.setAttribute('data-lenis-prevent', '');

  // Scroll to an element, leaving room for the sticky header
  const scrollToEl = (el) => {
    if (!lenis) { el.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' }); return; }
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    lenis.resize();
    lenis.scrollTo(el, { offset: -(header.offsetHeight + margin), duration: 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
  };

  // Shadow once the header is stuck (the top bar scrolls away first)
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > (topbar ? topbar.offsetHeight : 0) + 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Jump instantly, ignoring the CSS smooth scroll (used to restore the position)
  const jumpTo = (y) => {
    if (lenis) { lenis.scrollTo(y, { immediate: true, force: true }); return; }
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    root.style.scrollBehavior = prev;
  };

  // Mobile menu (full-screen overlay)
  let open = false;
  let savedY = 0;

  const lock = () => {
    savedY = window.scrollY;
    if (lenis) lenis.stop();
    body.style.top = `-${savedY}px`;
    body.classList.add('menu-locked');
  };
  const unlock = () => {
    body.classList.remove('menu-locked');
    body.style.top = '';
    if (lenis) { lenis.start(); lenis.resize(); }
    jumpTo(savedY);
  };

  const setOpen = (next, { restoreFocus = true } = {}) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    menu.classList.toggle('is-open', open);
    if (open) {
      lock();
      menu.querySelector('.menu-body').scrollTop = 0;
      closeBtn.focus({ preventScroll: true });
    } else {
      unlock();
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener('click', () => setOpen(true));
  closeBtn.addEventListener('click', () => setOpen(false));

  // Link inside the menu: close, then scroll from the original position
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (!target) { setOpen(false); return; }
      e.preventDefault();
      setOpen(false, { restoreFocus: false });
      if (history.pushState) history.pushState(null, '', href);
      if (a.classList.contains('menu-link')) setActive(href);
      scrollToEl(target);
    } else if (!href.startsWith('tel:') && !href.startsWith('mailto:')) {
      // Link to another page: just leave the lock off
      setOpen(false, { restoreFocus: false });
    }
  });

  // In-page links everywhere else: smooth scroll to the section
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || menu.contains(a) || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const href = a.getAttribute('href');
    if (href === '#') { e.preventDefault(); lenis ? lenis.scrollTo(0, { duration: 1.3 }) : window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' }); return; }
    let target = null;
    try { target = document.querySelector(href); } catch (_) { return; }
    if (!target) return;
    e.preventDefault();
    if (history.pushState) history.pushState(null, '', href);
    scrollToEl(target);
  });

  // Esc closes, Tab stays inside the menu
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key !== 'Tab') return;
    const items = [...menu.querySelectorAll('a[href], button')];
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Back to desktop width, or page restored from the back/forward cache
  window.matchMedia('(min-width: 901px)').addEventListener('change', (m) => { if (m.matches) setOpen(false, { restoreFocus: false }); });
  window.addEventListener('pageshow', () => { if (open) setOpen(false, { restoreFocus: false }); });

  // Active link
  function setActive(hash) {
    links.forEach((a) => {
      const on = a.getAttribute('href') === hash;
      a.classList.toggle('is-active', on);
      on ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current');
    });
  }
  document.querySelectorAll('.nav-link').forEach((a) => a.addEventListener('click', () => setActive(a.getAttribute('href'))));

  // Scroll spy
  const ids = ['#accueil', '#a-propos', '#services', '#secteurs', '#demarche', '#consultation'];
  const sections = ids.map((id) => document.querySelector(id)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (open) return;
      entries.forEach((en) => { if (en.isIntersecting) setActive('#' + en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }
})();

/* Pied de page : année en cours */
(() => {
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();
