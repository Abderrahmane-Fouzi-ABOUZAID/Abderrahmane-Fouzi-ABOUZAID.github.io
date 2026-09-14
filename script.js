const menuButton = document.querySelector("[data-menu-button]");
const navLinks = document.querySelector("[data-nav-links]");
const mobileNavigation = window.matchMedia("(max-width: 47.999rem)");
const header = document.querySelector(".site-header");
const backgroundContent = [...document.body.children].filter(
  (element) => !["HEADER", "SCRIPT", "DIALOG"].includes(element.tagName),
);
const brand = document.querySelector(".brand");

function setMenu(open) {
  if (!menuButton || !navLinks) return;
  const expanded = open && mobileNavigation.matches;
  menuButton.setAttribute("aria-expanded", String(expanded));
  menuButton.setAttribute(
    "aria-label",
    expanded ? "Close navigation" : "Open navigation",
  );
  navLinks.dataset.open = String(expanded);
  navLinks.inert = mobileNavigation.matches && !expanded;
  backgroundContent.forEach((element) => {
    element.inert = expanded;
  });
  if (brand) brand.inert = expanded;
  document.body.classList.toggle("menu-open", expanded);
}

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  setMenu(open);
  if (open) navLinks?.querySelector("a")?.focus();
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    const wasOpen = navLinks.dataset.open === "true";
    setMenu(false);
    if (!wasOpen) return;
    const destination = new URL(link.href);
    if (destination.pathname === location.pathname && destination.hash) {
      const section = document.getElementById(destination.hash.slice(1));
      if (section) {
        section.setAttribute("tabindex", "-1");
        section.focus({ preventScroll: true });
      }
    } else {
      menuButton?.focus({ preventScroll: true });
    }
  });
});

const cvChooser = document.querySelector("[data-cv-chooser]");
function closeCV(restoreFocus = false) {
  if (!cvChooser?.open) return;
  cvChooser.open = false;
  if (restoreFocus)
    cvChooser.querySelector("summary")?.focus({ preventScroll: true });
}
document.addEventListener("click", (event) => {
  if (cvChooser?.open && !cvChooser.contains(event.target)) {
    closeCV(cvChooser.contains(document.activeElement));
  }
});
cvChooser?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => closeCV(true));
});
cvChooser?.addEventListener("focusout", () => {
  // Let the browser finish moving focus before deciding whether the chooser was left.
  queueMicrotask(() => {
    if (!cvChooser.contains(document.activeElement)) closeCV();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && navLinks?.dataset.open === "true") {
    const controls = [menuButton, ...navLinks.querySelectorAll("a")];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (event.key !== "Escape") return;
  if (navLinks?.dataset.open === "true") {
    setMenu(false);
    menuButton?.focus();
  }
  closeCV(true);
});

function syncNavigationMode() {
  if (!navLinks || !menuButton) return;
  const focused = document.activeElement;
  setMenu(false);
  header.classList.add("navigation-ready");
  if (mobileNavigation.matches && navLinks.contains(focused))
    menuButton.focus();
  else if (!mobileNavigation.matches && focused === menuButton)
    navLinks.querySelector("a")?.focus();
}
mobileNavigation.addEventListener("change", syncNavigationMode);
syncNavigationMode();

const sectionLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const observedSections = [...document.querySelectorAll("main > section[id]")];
if ("IntersectionObserver" in window && sectionLinks.length) {
  const visibleSections = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      });
      const currentSection = [...visibleSections].sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
      )[0];
      sectionLinks.forEach((link) => {
        if (link.hash === `#${currentSection?.id}`)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-20% 0px -65%", threshold: 0 },
  );
  observedSections.forEach((section) => observer.observe(section));
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const screenshotLinks = document.querySelectorAll(
  ".project-thumb, .case-visual a[href]",
);
if (
  screenshotLinks.length &&
  typeof HTMLDialogElement !== "undefined" &&
  typeof HTMLDialogElement.prototype.showModal === "function"
) {
  const viewer = document.createElement("dialog");
  viewer.className = "screenshot-viewer";
  viewer.id = "screenshot-viewer";
  viewer.setAttribute("aria-labelledby", "screenshot-title");
  viewer.innerHTML = `
    <div class="screenshot-toolbar">
      <button type="button" class="screenshot-back" autofocus>← Back to projects</button>
      <h2 class="screenshot-title" id="screenshot-title"></h2>
      <button type="button" class="screenshot-zoom" aria-pressed="false">Zoom in</button>
    </div>
    <div class="screenshot-stage" tabindex="0" role="region" aria-label="Screenshot, scroll to explore when zoomed">
      <p class="screenshot-status" role="status" hidden></p>
      <img alt="" hidden>
    </div>`;
  document.body.append(viewer);

  const backButton = viewer.querySelector(".screenshot-back");
  const zoomButton = viewer.querySelector(".screenshot-zoom");
  const title = viewer.querySelector(".screenshot-title");
  const stage = viewer.querySelector(".screenshot-stage");
  const fullImage = stage.querySelector("img");
  const status = stage.querySelector(".screenshot-status");
  let opener;

  function setScreenshotZoom(zoomed) {
    const imageWidth = fullImage.naturalWidth || stage.clientWidth;
    const imageHeight = fullImage.naturalHeight || stage.clientHeight;
    const fittedWidth = Math.min(
      stage.clientWidth,
      (stage.clientHeight * imageWidth) / imageHeight,
    );
    fullImage.style.width = zoomed
      ? `${Math.max(imageWidth, fittedWidth * 1.5)}px`
      : "";
    stage.classList.toggle("is-zoomed", zoomed);
    zoomButton.setAttribute("aria-pressed", String(zoomed));
    zoomButton.textContent = zoomed ? "Fit to screen" : "Zoom in";
    stage.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  function imageReady() {
    if (!fullImage.naturalWidth) return;
    fullImage.hidden = false;
    status.hidden = true;
    zoomButton.disabled = false;
    stage.setAttribute("aria-busy", "false");
  }
  fullImage.addEventListener("load", imageReady);
  fullImage.addEventListener("error", () => {
    fullImage.hidden = true;
    status.hidden = false;
    status.textContent =
      "This screenshot could not load. Close the viewer and select the image to try again.";
    zoomButton.disabled = true;
    stage.setAttribute("aria-busy", "false");
  });

  screenshotLinks.forEach((link) => {
    link.setAttribute("aria-haspopup", "dialog");
    link.setAttribute("aria-controls", viewer.id);
    link.addEventListener("click", (event) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const thumbnail = link.querySelector("img");
      if (!thumbnail) return;
      event.preventDefault();
      opener = link;
      fullImage.hidden = true;
      status.hidden = false;
      status.textContent = "Loading screenshot…";
      zoomButton.disabled = true;
      stage.setAttribute("aria-busy", "true");
      fullImage.src = thumbnail.currentSrc || thumbnail.src;
      fullImage.alt = thumbnail.alt;
      title.textContent =
        link.closest(".project-row")?.querySelector("h3")?.textContent ||
        document.querySelector(".case-hero h1")?.textContent ||
        "Project screenshot";
      backButton.textContent = link.closest(".project-row")
        ? "← Back to projects"
        : "← Back to case study";
      viewer.showModal();
      document.body.classList.add("screenshot-open");
      setScreenshotZoom(false);
      if (fullImage.complete) imageReady();
    });
  });

  backButton.addEventListener("click", () => viewer.close());
  zoomButton.addEventListener("click", () =>
    setScreenshotZoom(zoomButton.getAttribute("aria-pressed") !== "true"),
  );
  viewer.addEventListener("click", (event) => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      viewer.close();
  });
  viewer.addEventListener("close", () => {
    document.body.classList.remove("screenshot-open");
    setScreenshotZoom(false);
    opener?.focus({ preventScroll: true });
  });
}
