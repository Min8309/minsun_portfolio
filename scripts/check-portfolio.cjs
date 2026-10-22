// Run with Playwright installed and a local static server on port 8000.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#projects article').count(), 4);
    const gallery = page.locator('[data-gallery]');
    const slides = gallery.locator('.gallery-slide');
    const slideCount = await slides.count();
    await gallery.locator('.gallery-prev').click();
    assert.equal(await slides.last().isVisible(), true);
    assert.ok((await gallery.locator('[data-gallery-status]').innerText()).startsWith(`${slideCount} / ${slideCount}`));
    await gallery.locator('.gallery-next').click();
    assert.equal(await slides.first().isVisible(), true);
    await gallery.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await slides.nth(1).isVisible(), true);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await slides.first().isVisible(), true);

    assert.equal(await page.locator('.featured-decision').count(), 4);
    assert.ok((await page.locator('.hero-lead').innerText()).includes('8년의 운영'));
    assert.notEqual(await page.locator('.hero-title .highlight').evaluate(item => getComputedStyle(item).backgroundImage), 'none');
    assert.equal(await page.locator('#more-work article').count(), 7);
    assert.equal(await page.locator('.project-index-list a').count(), 11);
    assert.equal(await page.locator('article a.service-link').count(), 10);
    assert.equal(await page.locator('#work-maljup .service-link').isDisabled(), true);
    const ids = await page.locator('[id]').evaluateAll(items => items.map(item => item.id));
    assert.equal(new Set(ids).size, ids.length);
    for (const button of await page.locator('article button[onclick]').all()) {
      await button.click();
      assert.equal(await page.locator('#detailModal').isVisible(), true);
      assert.equal(await page.locator('#modalBody button[onclick]').count(), 0);
      const links = await page.locator('#modalBody a').evaluateAll(items => items.map(item => item.getAttribute('href')));
      assert.equal(new Set(links).size, links.length);
      // Reopening an already open dialog must not overwrite the original page state.
      await page.evaluate(() => openDetailModal('maljup'));
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.equal(await button.evaluate(item => document.activeElement === item), true);
      assert.equal(await page.locator('main').evaluate(item => item.inert), false);
    }
    for (const width of [1440, 901, 900, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const bounds = await gallery.evaluate(item => ({
        image: item.querySelector('.gallery-viewport').getBoundingClientRect().toJSON(),
        prev: item.querySelector('.gallery-prev').getBoundingClientRect().toJSON(),
        next: item.querySelector('.gallery-next').getBoundingClientRect().toJSON()
      }));
      assert.ok(bounds.prev.right <= bounds.image.left);
      assert.ok(bounds.next.left >= bounds.image.right);

      const positions = await page.locator('.representative-card').evaluateAll(cards => cards.map(card => ({
        image: card.querySelector('.project-cover').getBoundingClientRect().toJSON(),
        text: card.querySelector('.project-card-main').getBoundingClientRect().toJSON()
      })));
      positions.forEach(({ image, text }, index) => {
        if (width > 900) assert.ok(index % 2 ? image.x > text.x : image.x < text.x);
        else assert.ok(image.y < text.y);
      });
    }
    await page.locator('.menu-toggle').click();
    await page.locator('.project-index-list a[href="#work-maljup"]').click();
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'work-maljup');
    const about = page.locator('.interactive-role-button');
    const normal = await about.evaluate(item => getComputedStyle(item).backgroundColor);
    await about.hover();
    assert.equal(await about.evaluate(item => getComputedStyle(item).backgroundColor), normal);
    assert.equal(normal, 'rgb(232, 240, 252)');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: project counts, index, service buttons, dialog state/focus, responsive layout, mobile menu, fixed About Me color.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
