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
      assert.equal(await gallery.locator('[data-gallery-toggle]').count(), 0);
      await gallery.hover();
      const hovered = await index();
      await page.clock.fastForward(5000);
      assert.equal(await index(), (hovered + 1) % count, `${key}: playback continues on hover`);
      await gallery.focus();
      const focused = await index();
      await page.clock.fastForward(5000);
      assert.equal(await index(), (focused + 1) % count, `${key}: playback continues on focus`);
      const beforeManual = await index();
      await page.keyboard.press('ArrowRight');
      assert.equal(await index(), (beforeManual + 1) % count, `${key}: manual navigation`);
      await page.clock.fastForward(5000);
      assert.equal(await index(), (beforeManual + 2) % count, `${key}: autoplay continues after manual navigation`);
    }
    console.log('PASS: both galleries loop automatically without toggle buttons, including hover/focus and manual navigation.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
