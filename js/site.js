// Theme toggle, sticky header state, reveal on scroll, platform-aware download buttons.
(() => {
  const html = document.documentElement;
  html.classList.add('js');

  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => html.dataset.theme || (systemDark.matches ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      // Back to following the system when the choice matches it.
      if (next === (systemDark.matches ? 'dark' : 'light')) delete html.dataset.theme;
      else html.dataset.theme = next;
      try {
        if (html.dataset.theme) localStorage.setItem('theme', html.dataset.theme);
        else localStorage.removeItem('theme');
      } catch {}
    }),
  );

  const bar = document.querySelector('.topbar');
  const onScroll = () => bar?.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('is-in'));
  }

  const ua = navigator.userAgent;
  const isMac = /Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua);
  const isDesktop = !/Android|iPhone|iPad|Mobile/.test(ua);
  if (!isMac && isDesktop) {
    document.querySelectorAll('[data-other-os]').forEach((el) => (el.hidden = false));
  }
})();
