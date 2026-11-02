// Run with Playwright and a local static server; virtual time verifies playback state.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference', hasTouch: width < 900 });
      await page.clock.install();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
      await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
      for (const key of ['seoul-data', 'maljup']) {
        const gallery = page.locator(`#work-${key} [data-gallery]`);
        const toggle = gallery.locator('[data-gallery-toggle]');
        const index = () => gallery.evaluate(el => [...el.querySelectorAll('.gallery-slide')].findIndex(s => !s.hidden));
        const count = await gallery.locator('.gallery-slide').count();
        const activate = () => width < 900 ? toggle.tap() : toggle.click();
        await gallery.scrollIntoViewIfNeeded();
        await page.clock.runFor(500);
        await page.waitForTimeout(100);
        let start = await index();
        for (let step = 1; step <= count; step++) {
          await page.clock.fastForward(5000);
          assert.equal(await index(), (start + step) % count, `${width} ${key}: autoplay wraps`);
        }
        await activate();
        assert.equal(await toggle.innerText(), '자동 재생');
        start = await index();
        await page.clock.fastForward(15000);
        assert.equal(await index(), start, 'paused');
        await gallery.locator('.gallery-next').click();
        assert.equal(await index(), (start + 1) % count);
        await page.clock.fastForward(10000);
        assert.equal(await index(), (start + 1) % count, 'manual next preserves pause');
        await gallery.locator('.gallery-prev').click();
        assert.equal(await index(), start);
        await gallery.focus();
        await page.keyboard.press('ArrowRight');
        start = await index();
        for (const modal of ['media', 'detail']) {
          const trigger = modal === 'media' ? gallery.locator('[data-expand-project]') : page.locator(`#work-${key} button[onclick]`);
          await trigger.click();
          await page.clock.fastForward(15000);
          assert.equal(await index(), start);
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => document.body.style.overflow === '');
          assert.equal(await trigger.evaluate(e => document.activeElement === e), true, 'focus returns');
          await page.clock.fastForward(10000);
          assert.equal(await index(), start, 'pause survives modal close');
        }
        await gallery.scrollIntoViewIfNeeded();
        await page.clock.runFor(500);
        await page.waitForTimeout(100);
        await toggle.focus();
        await page.keyboard.press('Enter');
        assert.equal(await toggle.innerText(), '일시정지');
        await page.clock.fastForward(5000);
        assert.equal(await index(), (start + 1) % count, 'keyboard resume');
        await page.keyboard.press('Space');
        assert.equal(await toggle.innerText(), '자동 재생');
        for (let i = 0; i < 4; i++) await activate();
        start = await index();
        await page.clock.fastForward(15000);
        assert.equal(await index(), start, 'repeated toggle preserves final pause');
        await activate();
        await gallery.locator('[data-expand-project]').click();
        start = await index();
        await page.clock.fastForward(15000);
        assert.equal(await index(), start, 'playing gallery suspends behind modal');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.body.style.overflow === '');
        await page.clock.runFor(500);
        await page.waitForTimeout(100);
        await page.clock.fastForward(5000);
        assert.equal(await index(), (start + 1) % count, 'playing gallery resumes after close');
        assert.ok(await toggle.evaluate(e => e.getBoundingClientRect().height >= 44));
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await page.close();
    }
    const reduced = await browser.newPage({ reducedMotion: 'reduce' });
    await reduced.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:8000');
    assert.deepEqual(await reduced.locator('[data-gallery-toggle]').allTextContents(), ['자동 재생', '자동 재생']);
    console.log('PASS: 390/768/1440px playback, pause/resume, touch/keyboard, manual navigation, wrap, repeated toggles, modal state/focus, reduced motion.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
