import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const baseUrl = process.argv[2] ?? "http://127.0.0.1:4173/collage/";
const outputDir = "output/playwright";
mkdirSync(outputDir, { recursive: true });
const fixture = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+3MxZlQAAAABJRU5ErkJggg==", "base64");

const expect = (condition, message) => { if (!condition) throw new Error(message); };
const touch = (session, type, points) => session.send("Input.dispatchTouchEvent", {
  type,
  touchPoints: points.map(([x, y], index) => ({ x, y, id: index + 1, radiusX: 1, radiusY: 1, force: 1 })),
});
const tap = async (session, x, y) => { await touch(session, "touchStart", [[x, y]]); await touch(session, "touchEnd", []); };
const swipe = async (session, x1, y1, x2, y2) => {
  await touch(session, "touchStart", [[x1, y1]]);
  await touch(session, "touchMove", [[(x1 + x2) / 2, (y1 + y2) / 2]]);
  await touch(session, "touchMove", [[x2, y2]]);
  await touch(session, "touchEnd", []);
};
const cancel = async (session, x, y) => { await touch(session, "touchStart", [[x, y]]); await touch(session, "touchCancel", []); };

async function selectedCount(page) {
  const text = await page.locator("body").innerText();
  return Number(text.match(/(\d+) cells selected/)?.[1] ?? -1);
}
async function center(page, selector) {
  const box = await page.locator(selector).boundingBox();
  expect(box, `Missing canvas: ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}
async function prepare(page, mode) {
  await page.goto(baseUrl);
  await page.locator("input[type=file]").setInputFiles({ name: "touch-fixture.png", mimeType: "image/png", buffer: fixture });
  if (mode === "manual") {
    await page.getByRole("button", { name: /manual/i }).click();
    await page.getByRole("button", { name: /^apply$/i }).click();
    await page.locator("[data-testid=layout-stage] canvas").waitFor();
    return "[data-testid=layout-stage] canvas";
  }
  await page.getByRole("button", { name: /horizontal/i }).click();
  await page.getByRole("button", { name: /adjust layout/i }).click();
  await page.locator("[data-testid=collage-stage] canvas").waitFor();
  return "[data-testid=collage-stage] canvas";
}
async function scenario(context, browserName, mode, iteration) {
  const page = await context.newPage();
  const trace = [];
  await page.addInitScript(() => {
    window.__touchEvents = [];
    for (const type of ["pointerdown", "pointerup", "pointercancel", "gotpointercapture", "lostpointercapture"]) document.addEventListener(type, (event) => window.__touchEvents.push({ type, target: event.target.tagName, pointerType: event.pointerType, pointerId: event.pointerId }), true);
  });
  const selector = await prepare(page, mode);
  const session = await context.newCDPSession(page);
  let point = await center(page, selector);
  await tap(session, point.x, point.y); expect(await selectedCount(page) === 1, `${mode} tap did not select`);
  await tap(session, point.x, point.y); expect(await selectedCount(page) === 0, `${mode} second tap did not deselect`);
  await swipe(session, point.x - 90, point.y, point.x + 90, point.y);
  await page.waitForTimeout(50);
  point = await center(page, selector);
  await tap(session, point.x - point.box.width * 0.2, point.y); await tap(session, point.x + point.box.width * 0.2, point.y);
  const splitSelectionCount = await selectedCount(page);
  await page.screenshot({ path: `${outputDir}/${browserName}-${mode}-${iteration}.png` });
  await page.evaluate(() => { window.__touchEvents = []; });
  await cancel(session, point.x, point.y);
  expect(await selectedCount(page) === 2, `${mode} cancellation changed selection`);
  trace.push(...await page.evaluate(() => window.__touchEvents));
  await page.close();
  return { mode, iteration, passed: true, splitSelectionCount, events: trace };
}

const results = [];
for (const [name, options] of [["chromium", {}], ["edge", { channel: "msedge" }]]) {
  const browser = await chromium.launch({ headless: true, ...options });
  const context = await browser.newContext({ viewport: { width: 412, height: 892 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await context.tracing.start({ screenshots: true, snapshots: true });
  try {
    for (const mode of ["manual", "adjust"]) for (let iteration = 1; iteration <= 3; iteration++) results.push(await scenario(context, name, mode, iteration));
  } finally {
    await context.tracing.stop({ path: `${outputDir}/${name}-touch-gestures.zip` });
    await context.close();
    await browser.close();
  }
}
console.log(JSON.stringify({ baseUrl, results }, null, 2));
