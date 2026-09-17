/* Run against the local server with Playwright and axe-core on NODE_PATH.
 * See docs/ui-ux-audit.tex for the setup command and verification boundaries. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const axePath = require.resolve("axe-core/axe.min.js");
const baseURL = process.env.PORTFOLIO_BASE_URL || "http://127.0.0.1:8765";
const artifactDir =
  process.env.PORTFOLIO_ARTIFACT_DIR || "/tmp/portfolio-ui-audit";
const routes = [
  "/",
  ...["dnssi", "academy", "leap", "medisphere", "pwc", "graph-simulation"].map(
    (name) => `/projects/${name}.html`,
  ),
  "/404.html",
];
const widths = [320, 390, 480, 768, 820, 1024, 1280, 1440, 1920];
const report = {
  layouts: 0,
  accessibility: [],
  noJavaScript: 0,
  textScaling: 0,
  interactions: [],
  runtimeErrors: [],
  fontLoading: [],
};
fs.mkdirSync(artifactDir, { recursive: true });

async function geometry(page, label) {
  const failures = await page.evaluate(() => {
    const visible = (element) =>
      element.checkVisibility() &&
      !element.closest("[inert]") &&
      !(element.closest("details:not([open])") && !element.closest("summary"));
    const size = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        element: element.className || element.tagName,
        text: element.textContent.trim().slice(0, 50),
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
      };
    };
    const actions = [
      ...document.querySelectorAll('a, button, summary, [tabindex="0"]'),
    ]
      .filter(visible)
      .map(size);
    const main = [...document.querySelectorAll("main *")]
      .filter(visible)
      .map(size);
    const overlapping = [];
    document
      .querySelectorAll(
        ".project-row, .project-row-proof, .case-meta, .decision-grid, .flow-diagram, .cv-row",
      )
      .forEach((parent) => {
        const children = [...parent.children].filter(visible);
        children.forEach((element, index) => {
          const a = element.getBoundingClientRect();
          children.slice(index + 1).forEach((other) => {
            const b = other.getBoundingClientRect();
            if (
              Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
            )
              overlapping.push([element.className, other.className]);
          });
        });
      });
    return {
      horizontalOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      undersized: actions.filter(
        (rect) => rect.width < 47.9 || rect.height < 47.9,
      ),
      escaped: main.filter(
        (rect) =>
          rect.right > document.documentElement.clientWidth + 1 ||
          rect.left < -1,
      ),
      overlapping,
    };
  });
  assert.deepEqual(
    failures,
    { horizontalOverflow: false, undersized: [], escaped: [], overlapping: [] },
    label,
  );
}
async function axe(page, label) {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(() =>
    window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"],
      },
    }),
  );
  report.accessibility.push({
    label,
    violations: result.violations,
    manualReview: result.incomplete.map((rule) => ({
      id: rule.id,
      targets: rule.nodes.map((node) => node.target),
    })),
  });
  assert.deepEqual(
    result.violations.map((rule) => ({
      id: rule.id,
      targets: rule.nodes.map((node) => node.target),
    })),
    [],
    label,
  );
}
async function capture(page, name) {
  await page.evaluate(async () => {
    document.querySelectorAll("main img").forEach((img) => {
      img.loading = "eager";
    });
    await Promise.all(
      [...document.images]
        .filter((img) => img.checkVisibility())
        .map((img) => img.decode().catch(() => {})),
    );
    scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({ path: path.join(artifactDir, name), fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", (error) => report.runtimeErrors.push(error.message));
    for (const route of routes) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(baseURL + route);
        await page.evaluate(() => document.fonts.ready);
        await geometry(page, `${route} at ${width}px`);
        report.layouts++;
        if ([320, 1440].includes(width))
          await axe(page, `${route} at ${width}px`);
      }
      // CSS text enlargement complements the narrow viewport reflow checks.
      for (const width of [320, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(baseURL + route);
        await page.addStyleTag({ content: "html { font-size: 200%; }" });
        await geometry(page, `${route} at ${width}px and 200% text`);
        report.textScaling++;
      }
    }
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(baseURL);
      await capture(page, `home-${width}.png`);
      await page.goto(baseURL + "/projects/dnssi.html");
      await capture(page, `dnssi-${width}.png`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseURL);
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator(".skip-link")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press("Enter");
    assert.equal(
      await page
        .locator("main")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    const menu = page.locator("[data-menu-button]");
    const nav = page.locator("[data-nav-links]");
    await menu.click();
    assert.equal(await menu.getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("main").evaluate((el) => el.inert), true);
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await menu.evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await nav
        .locator("a")
        .last()
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await menu.evaluate((el) => el === document.activeElement),
      true,
    );
    await geometry(page, "Mobile navigation open");
    await axe(page, "Mobile navigation open");
    await page.keyboard.press("Escape");
    assert.equal(await menu.getAttribute("aria-expanded"), "false");
    assert.equal(
      await menu.evaluate((el) => el === document.activeElement),
      true,
    );
    await menu.click();
    await nav.locator('a[href="#work"]').click();
    assert.equal(
      await page
        .locator("#work")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await menu.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(await page.locator("main").evaluate((el) => el.inert), false);
    assert.equal(await nav.evaluate((el) => el.inert), false);
    report.interactions.push(
      "Skip link; mobile focus loop includes close button; Escape; destination focus; desktop resize",
    );

    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(baseURL);
    const chooser = page.locator("[data-cv-chooser]");
    await chooser.locator("summary").click();
    await geometry(page, "CV chooser open at 320px");
    await axe(page, "CV chooser open");
    for (const link of await chooser.locator("a").all()) {
      const response = await page.request.get(
        new URL(await link.getAttribute("href"), page.url()).href,
      );
      assert.equal(response.ok(), true);
    }
    await page.keyboard.press("Escape");
    assert.equal(await chooser.evaluate((el) => el.open), false);
    await chooser.locator("summary").click();
    await chooser.locator("a").last().focus();
    await page.keyboard.press("Tab");
    assert.equal(await chooser.evaluate((el) => el.open), false);
    report.interactions.push(
      "CV target sizes, PDF responses, Escape, focus departure",
    );

    for (const route of [
      "/",
      "/projects/dnssi.html",
      "/projects/academy.html",
      "/projects/leap.html",
    ]) {
      await page.goto(baseURL + route);
      const links = page.locator(
        ".project-thumb, .case-visual a[href], .credential-visual",
      );
      for (const opener of await links.all()) {
        await opener.click();
        const dialog = page.locator("dialog");
        await dialog.locator("img").waitFor({ state: "visible" });
        await geometry(page, "Screenshot viewer");
        assert.equal(await dialog.evaluate((el) => el.open), true);
        await page.locator(".screenshot-zoom").click();
        assert.equal(
          await page.locator(".screenshot-zoom").getAttribute("aria-pressed"),
          "true",
        );
        const stage = page.locator("dialog .screenshot-stage");
        assert.equal(
          await stage.evaluate(
            (el) =>
              el.scrollWidth > el.clientWidth ||
              el.scrollHeight > el.clientHeight,
          ),
          true,
        );
        await page.locator(".screenshot-zoom").click();
        await page.keyboard.press("Escape");
        assert.equal(
          await opener.evaluate((el) => el === document.activeElement),
          true,
        );
        assert.equal(
          await page
            .locator("body")
            .evaluate((el) => el.classList.contains("screenshot-open")),
          false,
        );
      }
    }
    report.interactions.push(
      "All nine image entry points: fit, zoom, Escape, focus restoration",
    );

    await page.goto(baseURL);
    await page.locator(".project-thumb").first().click();
    await axe(page, "Screenshot viewer open");
    await page.locator(".screenshot-back").last().click();
    await page
      .locator(".project-thumb")
      .first()
      .evaluate((el) => {
        el.querySelector("img").src = "/missing-audit-image.webp";
      });
    await page.locator(".project-thumb").first().click();
    await page.waitForFunction(() =>
      document
        .querySelector("dialog .screenshot-status")
        .textContent.includes("could not load"),
    );
    assert.equal(await page.locator(".screenshot-zoom").isDisabled(), true);
    await page.keyboard.press("Escape");
    report.interactions.push(
      "Screenshot load failure has a readable status and working exit",
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(baseURL);
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
      "auto",
    );
    assert.equal(
      await page
        .locator(".button")
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration),
      "0s",
    );
    await page.emulateMedia({ forcedColors: "active" });
    await page.locator(".button").first().focus();
    assert.notEqual(
      await page
        .locator(".button")
        .first()
        .evaluate((el) => getComputedStyle(el).outlineStyle),
      "none",
    );
    report.interactions.push("Reduced motion and forced-color focus");
    await context.close();

    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noJS.newPage();
    for (const route of routes) {
      for (const width of [320, 1440]) {
        await fallback.setViewportSize({ width, height: 900 });
        await fallback.goto(baseURL + route);
        await geometry(fallback, `No JavaScript: ${route} at ${width}`);
        assert.equal(
          await fallback.locator(".nav-links a:visible").count(),
          route === "/404.html" ? 0 : 6,
        );
        report.noJavaScript++;
      }
    }
    await fallback.setViewportSize({ width: 320, height: 568 });
    await fallback.goto(baseURL);
    await fallback.locator(".project-thumb").first().click();
    assert.equal(
      await fallback.locator(".screenshot-fallback:target").count(),
      1,
    );
    await geometry(fallback, "Screenshot hash fallback without JavaScript");
    await fallback
      .locator(".screenshot-fallback:target .screenshot-back")
      .click();
    // Native anchor motion must finish before a second programmatic scroll.
    await fallback.waitForTimeout(2000);
    assert.equal(new URL(fallback.url()).hash, "#project-dnssi");
    await fallback.locator("summary").click();
    await geometry(fallback, "CV without JavaScript");
    report.interactions.push("No-JavaScript screenshot return and CV chooser");
    await noJS.close();

    for (const mode of ["normal", "delayed", "blocked"]) {
      const fonts = await browser.newContext();
      const fontPage = await fonts.newPage();
      if (mode !== "normal")
        await fontPage.route("**/*.woff2", async (route) => {
          if (mode === "blocked") return route.abort();
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return route.continue();
        });
      await fontPage.addInitScript(() => {
        window.auditShifts = [];
        new PerformanceObserver((list) =>
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) window.auditShifts.push(entry.value);
          }),
        ).observe({ type: "layout-shift", buffered: true });
      });
      await fontPage.goto(baseURL);
      await fontPage.evaluate(() => document.fonts.ready);
      await fontPage.waitForTimeout(200);
      const shifts = await fontPage.evaluate(() =>
        window.auditShifts.reduce((sum, value) => sum + value, 0),
      );
      report.fontLoading.push({ mode, layoutShift: shifts });
      assert.equal(shifts, 0, `Layout shift with ${mode} font`);
      await fonts.close();
    }
    assert.deepEqual(report.runtimeErrors, []);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    fs.writeFileSync(
      path.join(artifactDir, "results.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
