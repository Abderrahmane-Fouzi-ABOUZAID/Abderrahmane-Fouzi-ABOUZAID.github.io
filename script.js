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

const screenshotLinks = document.querySelectorAll('.project-thumb, .case-visual a[href]');

if (screenshotLinks.length && typeof HTMLDialogElement !== 'undefined') {
  const viewer = document.createElement('dialog');
  viewer.className = 'screenshot-viewer';
  viewer.id = 'screenshot-viewer';
  viewer.setAttribute('aria-labelledby', 'screenshot-title');
  viewer.innerHTML = `
    <div class="screenshot-toolbar">
      <button type="button" class="screenshot-back" autofocus>← Back to projects</button>
      <h2 class="screenshot-title" id="screenshot-title"></h2>
      <button type="button" class="screenshot-zoom" aria-pressed="false">Zoom in</button>
    </div>
    <div class="screenshot-stage" tabindex="0" role="region" aria-label="Screenshot, scroll to explore when zoomed">
      <img alt="">
    </div>`;
  document.body.append(viewer);

  const backButton = viewer.querySelector('.screenshot-back');
  const zoomButton = viewer.querySelector('.screenshot-zoom');
  const title = viewer.querySelector('.screenshot-title');
  const stage = viewer.querySelector('.screenshot-stage');
  const fullImage = stage.querySelector('img');
  let opener;

  function setScreenshotZoom(zoomed) {
    const imageWidth = fullImage.naturalWidth || stage.clientWidth;
    const imageHeight = fullImage.naturalHeight || stage.clientHeight;
    const fittedWidth = Math.min(stage.clientWidth, stage.clientHeight * imageWidth / imageHeight);
    fullImage.style.width = zoomed ? `${Math.max(imageWidth, fittedWidth * 1.5)}px` : '';
    stage.classList.toggle('is-zoomed', zoomed);
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? 'Fit to screen' : 'Zoom in';
    stage.scrollTo(0, 0);
  }

  screenshotLinks.forEach((link) => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', viewer.id);
    link.setAttribute('aria-label', link.getAttribute('aria-label')?.replace(' in a new tab', '') || 'View full screenshot');
    const label = link.querySelector('span');
    if (label) label.textContent = 'Full screenshot';

    link.addEventListener('click', (event) => {
      // Keep the usual link behavior for opening a separate tab intentionally.
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const thumbnail = link.querySelector('img');
      if (!thumbnail) return;
      event.preventDefault();
      opener = link;
      fullImage.src = link.href;
      fullImage.alt = thumbnail.alt;
      title.textContent = link.closest('.project-row')?.querySelector('h3')?.textContent
        || document.querySelector('.case-hero h1')?.textContent || 'Project screenshot';
      backButton.textContent = link.closest('.project-row') ? '← Back to projects' : '← Back to case study';
      setScreenshotZoom(false);
      document.body.classList.add('screenshot-open');
      viewer.showModal();
    });
  });

  backButton.addEventListener('click', () => viewer.close());
  zoomButton.addEventListener('click', () => {
    setScreenshotZoom(zoomButton.getAttribute('aria-pressed') !== 'true');
  });
  viewer.addEventListener('click', (event) => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      viewer.close();
    }
  });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('screenshot-open');
    setScreenshotZoom(false);
    opener?.focus({ preventScroll: true });
  });
}
