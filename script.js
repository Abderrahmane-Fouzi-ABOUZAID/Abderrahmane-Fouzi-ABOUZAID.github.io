const menuButton = document.querySelector('[data-menu-button]');
const navLinks = document.querySelector('[data-nav-links]');
const mobileNavigation = window.matchMedia('(max-width: 760px)');

function setMenu(open) {
  if (!menuButton || !navLinks) return;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navLinks.dataset.open = String(open);
  navLinks.inert = mobileNavigation.matches && !open;
  document.body.classList.toggle('menu-open', open);
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  setMenu(open);
  if (open) navLinks?.querySelector('a')?.focus();
});

navLinks?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});

const cvChooser = document.querySelector('[data-cv-chooser]');

document.addEventListener('click', (event) => {
  if (cvChooser?.open && !cvChooser.contains(event.target)) {
    cvChooser.removeAttribute('open');
  }
});

cvChooser?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => cvChooser.removeAttribute('open'));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && navLinks?.dataset.open === 'true') {
    const links = [...navLinks.querySelectorAll('a')];
    const first = links[0];
    const last = links.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  if (event.key !== 'Escape') return;

  if (navLinks?.dataset.open === 'true') {
    setMenu(false);
    menuButton?.focus();
  }

  if (cvChooser?.open) {
    cvChooser.removeAttribute('open');
    cvChooser.querySelector('summary')?.focus();
  }
});

function syncNavigationMode() {
  if (!navLinks || !menuButton) return;
  if (mobileNavigation.matches) {
    setMenu(false);
  } else {
    navLinks.inert = false;
    navLinks.dataset.open = 'false';
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    document.body.classList.remove('menu-open');
  }
}

mobileNavigation.addEventListener('change', syncNavigationMode);
syncNavigationMode();

const sectionLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const observedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window && observedSections.length) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;

    sectionLinks.forEach((link) => {
      const current = link.getAttribute('href') === `#${visible.target.id}`;
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-30% 0px -55%', threshold: [0.05, 0.25, 0.5] });

  observedSections.forEach((section) => observer.observe(section));
}

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});
