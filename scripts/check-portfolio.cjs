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
    assert.deepEqual(await page.locator('#projects article').evaluateAll(cards => cards.map(card => card.id)),
      ['work-gyeongseong-yarok', 'work-seoul-data', 'work-echo-chamber', 'work-maljup']);
    assert.deepEqual(await page.locator('#projects article').evaluateAll(cards => cards.map(card => card.dataset.track)), ['A', 'A', 'B', 'B']);
    assert.equal(await page.locator('#projects .featured-tech .tech-pill').count(), 16);
    assert.equal(await page.locator('#more-work #work-senior-helper').count(), 1);
    assert.equal(await page.locator('#more-work #work-ateliera').count(), 1);

    const featuredFrames = await page.locator('#projects .representative-card').evaluateAll(cards => cards.map(card => {
      const style = getComputedStyle(card);
      return { border: style.borderTopWidth, shadow: style.boxShadow, radius: style.borderTopLeftRadius };
    }));
    featuredFrames.forEach(frame => assert.deepEqual(frame, { border: '0px', shadow: 'none', radius: '0px' }));
    assert.notEqual(await page.locator('#more-work .project-card').first().evaluate(card => getComputedStyle(card).borderTopWidth), '0px');

    const gallery = page.locator('#work-seoul-data [data-gallery]');
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

    const maljupGallery = page.locator('#work-maljup [data-gallery]');
    const maljupSlides = maljupGallery.locator('.gallery-slide');
    for (const currentGallery of [gallery, maljupGallery]) {
      const images = currentGallery.locator('img.gallery-slide');
      for (let i = 0; i < await images.count(); i++) {
        const image = currentGallery.locator('img.gallery-slide:not([hidden])');
        const dimensions = await image.evaluate(async item => {
          await item.decode();
          const imageBox = item.getBoundingClientRect();
          const viewport = item.parentElement.getBoundingClientRect();
          return { ratio: imageBox.width / imageBox.height, originalRatio: item.naturalWidth / item.naturalHeight,
            fits: imageBox.left >= viewport.left - 1 && imageBox.right <= viewport.right + 1 && imageBox.top >= viewport.top - 1 && imageBox.bottom <= viewport.bottom + 1 };
        });
        assert.ok(Math.abs(dimensions.ratio - dimensions.originalRatio) < .01);
        assert.equal(dimensions.fits, true);
        await currentGallery.locator('.gallery-next').click();
      }
    }

    assert.equal(await maljupSlides.count(), 4);
    await maljupGallery.locator('.gallery-prev').click();
    assert.equal(await maljupSlides.last().isVisible(), true);
    assert.ok((await maljupGallery.locator('[data-gallery-status]').innerText()).includes('모바일'));
    await maljupGallery.locator('.gallery-next').click();
    await maljupGallery.locator('.gallery-next').click();
    assert.equal(await maljupSlides.nth(1).isVisible(), true);
    await maljupGallery.locator('.gallery-prev').click();
    assert.equal(await maljupSlides.first().isVisible(), true);
    assert.equal(await page.locator('.featured-decision').count(), 4);
    assert.equal(await page.locator('#projects .featured-summary').count(), 0);
    assert.equal(await page.locator('#projects .featured-contribution li').count(), 12);
    assert.ok((await page.locator('.hero-lead').innerText()).includes('소재 발굴부터 데이터 해석'));
    assert.equal(await page.locator('.hero-meta .tag').innerText(), '콘텐츠 마케터 · 브랜드 콘텐츠 & 데이터 기반 기획');
    assert.equal(await page.locator('.hero-visual, .floating-note').count(), 0);
    assert.equal(await page.locator('.hero-title .highlight').evaluate(item => getComputedStyle(item).color), 'rgb(36, 82, 245)');
    assert.equal(await page.locator('#more-work article').count(), 7);
    assert.equal(await page.locator('.project-index-list a').count(), 11);
    assert.deepEqual(await page.locator('.project-index-list a').evaluateAll(links => links.map(link => link.hash.slice(1))),
      await page.locator('article[id^="work-"]').evaluateAll(cards => cards.map(card => card.id)));

    assert.equal(await page.locator('article a.service-link').count(), 11);
    assert.equal(await page.locator('article a.github-link').count(), 10);
    assert.equal(await page.locator('#projects a.github-link').count(), 4);
    assert.equal(await page.locator('#work-maljup .service-link').getAttribute('href'), 'https://esl-101.onrender.com/');
    assert.equal(await page.locator('#work-echo-chamber .service-link').getAttribute('href'), 'https://echochamber-y3r4.onrender.com/');

    assert.equal(await page.locator('#projects .project-card-footer button.btn-primary').count(), 4);
    assert.equal(await page.locator('#projects .service-link.btn-outline').count(), 4);
    assert.equal(await page.locator('.art-core, .orbit').count(), 0);
    assert.equal(await page.locator('#projects [data-expand-project]').count(), 4);
    assert.equal(await page.locator('#more-work [data-expand-project]').count(), 0);
    for (const expand of await page.locator('#projects [data-expand-project]').all()) {
      await expand.click();
      assert.equal(await page.locator('#mediaViewer').evaluate(dialog => dialog.open), true);
      if (await page.locator('#mediaContent img').count()) {
        await page.locator('#mediaContent img').evaluate(image => image.decode());
        await page.locator('#mediaZoom').click();
        assert.equal(await page.locator('#mediaZoom').getAttribute('aria-pressed'), 'true');
        if (await page.locator('#mediaNext').isEnabled()) {
          await page.locator('#mediaNext').click();
          assert.equal(await page.locator('#mediaZoom').getAttribute('aria-pressed'), 'false');
          await page.keyboard.press('ArrowLeft');
        }
      } else {
        assert.equal(await page.locator('#mediaContent video').getAttribute('controls'), '');
      }
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.getElementById('mediaViewer').open && document.body.style.overflow === '');
      assert.equal(await expand.evaluate(item => document.activeElement === item), true);
    }
    await maljupGallery.locator('.gallery-prev').click();
    await page.locator('#work-maljup [data-expand-project]').click();
    assert.ok((await page.locator('#mediaViewerStatus').innerText()).includes('모바일'));
    const mobileScreen = await page.locator('#mediaContent img').evaluate(async image => {
      await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight };
    });
    assert.ok(mobileScreen.height > mobileScreen.width);
    await page.locator('#mediaClose').click();
    await page.waitForFunction(() => document.body.style.overflow === '');
    await maljupGallery.locator('.gallery-next').click();
    assert.equal(await page.locator('.senior-phone-link').getAttribute('href'), 'https://senior-helper-seven.vercel.app/');
    assert.equal(await page.locator('.senior-phone-link').getAttribute('target'), '_blank');
    const ids = await page.locator('[id]').evaluateAll(items => items.map(item => item.id));
    assert.equal(new Set(ids).size, ids.length);
    for (const button of await page.locator('article button[onclick]').all()) {
      await button.click();
      assert.equal(await page.locator('#detailModal').isVisible(), true);
      assert.equal(await page.locator('#modalBody button[onclick]').count(), 0);
      const featured = await button.evaluate(item => !!item.closest('#projects') || ['work-senior-helper', 'work-ateliera'].includes(item.closest('article').id));
      assert.equal(await page.locator('#modalBody .project-evidence').count(), featured ? 1 : 0);
      if (await button.evaluate(item => !!item.closest('#projects'))) {
        assert.equal(await page.locator('#modalBody .case-section').count(), 5);
        assert.ok(await page.locator('#modalBody .case-figure img').count() >= 1);
        for (const picture of await page.locator('#modalBody .case-figure img').all()) {
          await picture.evaluate(image => image.decode());
        }
        const sources = page.locator('#modalBody .case-references');
        assert.equal(await sources.evaluate(item => item.open), false);
        await sources.locator('summary').click();
        assert.equal(await sources.evaluate(item => item.open), true);
      }
      const links = await page.locator('#modalBody a').evaluateAll(items => items.map(item => item.getAttribute('href')));
      assert.equal(new Set(links).size, links.length);
      // Reopening an already open dialog must not overwrite the original page state.
      await page.evaluate(() => openDetailModal('maljup'));
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.equal(await button.evaluate(item => document.activeElement === item), true);
      assert.equal(await page.locator('main').evaluate(item => item.inert), false);
    }
    for (const width of [2560, 1920, 1440, 901, 900, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const leftEdges = await page.evaluate(() => ({ hero: document.querySelector('.hero-title').getBoundingClientRect().left, projects: document.querySelector('#projects .section-title').getBoundingClientRect().left }));
      assert.ok(Math.abs(leftEdges.hero - leftEdges.projects) < 1, `Hero and project headings must align at ${width}px`);
      const imageFits = await page.locator('#work-seoul-data .gallery-slide, #work-maljup .gallery-slide, #work-senior-helper .visual-primary').evaluateAll(images => images.map(image => getComputedStyle(image).objectFit));
      imageFits.forEach(fit => assert.equal(fit, 'contain'));

      const bounds = await gallery.evaluate(item => ({
        image: item.querySelector('.gallery-viewport').getBoundingClientRect().toJSON(),
        prev: item.querySelector('.gallery-prev').getBoundingClientRect().toJSON(),
        next: item.querySelector('.gallery-next').getBoundingClientRect().toJSON()
      }));
      assert.ok(bounds.prev.right <= bounds.image.left);
      assert.ok(bounds.next.left >= bounds.image.right);

      const phone = await page.locator('#work-senior-helper .visual-stage').evaluate(async stage => {
        const image = stage.querySelector('img'); await image.decode();
        const box = image.getBoundingClientRect();
        const link = stage.querySelector('.senior-phone-link').getBoundingClientRect();
        return { ratio: box.width / box.height, naturalRatio: image.naturalWidth / image.naturalHeight,
          left: (link.left - box.left) / box.width, width: link.width / box.width };
      });
      assert.ok(Math.abs(phone.ratio - phone.naturalRatio) < .01);
      assert.ok(Math.abs(phone.left - .3127) < .01);
      assert.ok(Math.abs(phone.width - .3218) < .01);
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
