const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
 try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
  const canvas = page.locator('.hero-neurons');
  assert.equal(await canvas.count(), 1);
  assert.equal(await canvas.evaluate(el => el.parentElement.className), 'hero');
  assert.equal(await canvas.getAttribute('aria-hidden'), 'true');
  assert.equal(await canvas.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  const snapshot = () => canvas.evaluate(el => el.toDataURL());
  await page.waitForTimeout(150);
  const first = await snapshot();
  await page.mouse.move(1250, 300);
  await page.waitForTimeout(350);
  assert.notEqual(await snapshot(), first, 'neural visual should respond to pointer movement');
  const button = page.locator('.hero-actions a').first();
  assert.equal(await button.evaluate(el => {
   const box = el.getBoundingClientRect();
   return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  }), true, 'decoration must not block buttons');
  await page.screenshot({ path: '/tmp/hero-neurons-desktop.png' });
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const offscreen = await snapshot();
  await page.waitForTimeout(200);
  assert.equal(await snapshot(), offscreen, 'offscreen drawing should stop');
  const reduced = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await reduced.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
  await reduced.waitForTimeout(150);
  const staticCanvas = reduced.locator('.hero-neurons');
  const still = await staticCanvas.evaluate(el => el.toDataURL());
  await reduced.mouse.move(1200, 200);
  await reduced.waitForTimeout(200);
  assert.equal(await staticCanvas.evaluate(el => el.toDataURL()), still, 'reduced motion should stay static');
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await mobile.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS: hero-only animation, pointer-safe controls, offscreen pause, reduced motion and mobile layout.');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
