// Run against the local static server. Uses a virtual clock to test real UI behavior.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
    for (const key of ['seoul-data', 'maljup']) {
      const gallery = page.locator(`#work-${key} [data-gallery]`);
      const index = () => gallery.evaluate(el => [...el.querySelectorAll('.gallery-slide')].findIndex(slide => !slide.hidden));
      const count = await gallery.locator('.gallery-slide').count();
      await gallery.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await page.clock.runFor(100);
      const start = await index();
      for (let step = 1; step <= count; step++) {
        await page.clock.fastForward(5000);
        assert.equal(await index(), (start + step) % count, `${key}: automatic advance and wrap`);
      }
      await gallery.hover();
      const hovered = await index();
      await page.clock.fastForward(10000);
      assert.equal(await index(), hovered, `${key}: pause on hover`);
      await page.mouse.move(0, 0);
      await gallery.focus();
      await page.clock.fastForward(10000);
      assert.equal(await index(), hovered, `${key}: pause on keyboard focus`);
      await page.keyboard.press('ArrowRight');
      assert.equal(await index(), (hovered + 1) % count, `${key}: manual navigation`);
      const toggle = gallery.locator('[data-gallery-toggle]');
      await toggle.click();
      await page.mouse.move(0, 0);
      const paused = await index();
      await page.clock.fastForward(10000);
      assert.equal(await index(), paused, `${key}: explicit pause`);
      await toggle.click();
      await page.mouse.move(0, 0);
      await page.clock.fastForward(5000);
      assert.equal(await index(), (paused + 1) % count, `${key}: resume`);
    }
    const reducedPage = await browser.newPage({ reducedMotion: 'reduce' });
    await reducedPage.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
    for (const toggle of await reducedPage.locator('[data-gallery-toggle]').all()) {
      assert.equal(await toggle.innerText(), '자동 재생 시작');
    }
    console.log('PASS: both galleries auto-advance and loop; hover, focus, pause/resume, manual navigation and reduced motion work.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
