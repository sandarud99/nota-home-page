import { expect, test, type Locator, type Page } from '@playwright/test';

async function scrollInScene(scene: Locator, fraction: number) {
  return scene.evaluate((stage, fraction) => {
    const spacer = stage.parentElement!;
    const start = spacer.getBoundingClientRect().top + scrollY;
    const end = start + spacer.offsetHeight - (stage as HTMLElement).offsetHeight;
    window.scrollTo({ top: start + (end - start) * fraction, behavior: 'instant' });
    return { start, end };
  }, fraction);
}

async function expectPinned(stage: Locator) {
  await expect.poll(async () => Math.abs((await stage.boundingBox())!.y)).toBeLessThan(3);
}

async function readScroll(page: Page) {
  return page.evaluate(() => window.scrollY);
}

for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
  test(`real homepage at ${width}×${height}`, async ({ browser }) => {
    const mobile = width < 768;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (!response.ok() && response.status() >= 400 && response.request().resourceType() === 'image') errors.push(response.url());
      });
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Smart pen\s+for real thinking/);
      await expect(page.locator('.pin-spacer')).toHaveCount(width < 992 ? 4 : 6);
      if (width < 992) await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
      else await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      const images = await page.locator('.artwork img').evaluateAll(async images => {
        await Promise.all(images.map(async image => {
          const img = image as HTMLImageElement;
          img.loading = 'eager';
          await img.decode();
        }));
        return images.map(image => (image as HTMLImageElement).naturalWidth);
      });
      expect(images.every(width => width > 0)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

      const hero = page.locator('.hero');
      const camera = hero.locator('.hero-camera');
      if (width < 992) {
        const start = (await camera.boundingBox())!.y;
        const header = hero.locator('.site-header');
        await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), Math.round(height * .12));
        await expect.poll(async () => (await camera.boundingBox())!.y).toBeLessThan(start - 50);
        await expect.poll(async () => (await header.boundingBox())!.y).toBe(0);
        await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), Math.round(height * .91));
        await expect.poll(async () => (await header.boundingBox())!.y).toBeLessThan(-3);
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await expect.poll(async () => (await header.boundingBox())!.y).toBe(0);
      } else {
        const start = (await camera.boundingBox())!.x;
        await scrollInScene(hero, .3);
        await expectPinned(hero);
        await expect.poll(async () => (await camera.boundingBox())!.x).toBeLessThan(start - 80);
        await scrollInScene(hero, .02);
        await expect.poll(async () => (await camera.boundingBox())!.x).toBeCloseTo(start, 0);
      }

      const specs = page.locator('.spec-scene');
      await scrollInScene(specs, .2);
      await expectPinned(specs);

      const paper = page.locator(width < 992 ? '.paper-story' : '#smartpaper');
      const paperBounds = await scrollInScene(paper, width < 992 ? .07 : .31);
      await expectPinned(paper);
      const paperControls = page.getByRole('group', { name: 'Smartpaper chapter' });
      await expect(paperControls.locator('[aria-current]')).toHaveAccessibleName('For the pen, it’s a precise map');
      const first = await readScroll(page);
      await paperControls.getByRole('button', { name: 'For you, it’s just a blank sheet' }).click();
      await expect(paperControls.locator('[aria-current]')).toHaveAccessibleName('For you, it’s just a blank sheet');
      expect(await readScroll(page)).toBeGreaterThan(first);
      await expectPinned(paper);
      await paperControls.getByRole('button', { name: 'For the pen, it’s a precise map' }).click();
      await expect(paperControls.locator('[aria-current]')).toHaveAccessibleName('For the pen, it’s a precise map');
      await expect.poll(() => readScroll(page)).toBeLessThan(first + (paperBounds.end - paperBounds.start) * .08);

      const finishes = page.locator('.finish-frame');
      await scrollInScene(finishes, .18);
      const finishControls = page.getByRole('group', { name: 'pen finish' });
      await finishControls.getByRole('button', { name: 'Precision Red.' }).click();
      await expect(finishControls.locator('[aria-current]')).toHaveAccessibleName('Precision Red.');
      await expectPinned(finishes);
      await finishControls.getByRole('button', { name: 'Mist Blue.' }).click();
      await expect(finishControls.locator('[aria-current]')).toHaveAccessibleName('Mist Blue.');
      await expectPinned(finishes);

      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
      await expect(page.getByRole('contentinfo')).toBeInViewport();
      await expect.poll(() => page.locator('.page-progress').evaluate(el => Number((el as HTMLElement).style.getPropertyValue('--progress')))).toBe(1);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test('desktop hero, sliding menu and panel wipe follow the scroll in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 1470, height: 762 });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  const hero = page.locator('.hero');
  const camera = hero.locator('.hero-camera');
  const profile = hero.locator('.hero-profile');
  const header = hero.locator('.site-header');
  const panels = hero.locator('.scene-wipe i');
  await expect(profile).toHaveAttribute('data-ready', '');
  await expect(panels).toHaveCount(6);

  const start = (await camera.boundingBox())!;
  await scrollInScene(hero, .36);
  await expectPinned(hero);
  await expect.poll(async () => (await camera.boundingBox())!.x).toBeLessThan(-60);
  const wide = (await profile.boundingBox())!.width;
  await scrollInScene(hero, .60);
  await expect.poll(async () => (await profile.boundingBox())!.width).toBeLessThan(wide * .72);
  await expect.poll(async () => (await header.boundingBox())!.y).toBe(0);

  await scrollInScene(hero, .65);
  await expect.poll(async () => (await header.boundingBox())!.y).toBeLessThan(-20);
  await expect(header).toHaveCSS('opacity', '1');
  const { end } = await scrollInScene(hero, .84);
  await expect(header).toBeHidden();
  await expectPinned(hero);
  const heights = () => panels.evaluateAll(columns => columns.map(column => column.getBoundingClientRect().height));
  await expect.poll(async () => (await heights())[0]).toBeGreaterThan(750);
  const rise = await heights();
  expect(rise[1]).toBeGreaterThan(rise[2]);
  expect(rise[2]).toBeGreaterThan(rise[3]);
  expect(rise[3]).toBeGreaterThan(rise[4]);
  await expect(panels.first()).toHaveCSS('box-shadow', /inset/);
  expect(await hero.evaluate(stage => stage.contains(document.elementFromPoint(innerWidth - 10, innerHeight - 10)))).toBe(true);

  const specs = page.locator('.spec-scene');
  const fade = () => specs.evaluate(stage => {
    const opacity = (selector: string) => Number(getComputedStyle(stage.querySelector(selector)!).opacity);
    return { title: opacity('.section-title'), dividers: opacity('.spec-intro-lines') };
  });

  await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), end + 1);
  await expectPinned(specs);
  await expect.poll(async () => (await fade()).dividers).toBeGreaterThan(.9);
  expect((await fade()).title).toBe(0);

  await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), end + 25);
  await expect.poll(async () => (await fade()).title).toBeGreaterThan(.01);
  const faint = await fade();
  expect(faint.title).toBeLessThan(.15);
  expect(faint.dividers).toBeGreaterThan(.12);
  expect(faint.dividers).toBeLessThan(.6);

  await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), end + 112);
  await expectPinned(specs);
  await expect.poll(fade).toEqual({ title: 1, dividers: 0 });
  const specHeading = page.getByRole('heading', { name: /Nota pen.*Specifications/i });
  await expect(specHeading).toBeInViewport();
  const center = (await specHeading.boundingBox())!;
  expect(center.y + center.height / 2).toBeGreaterThan(762 * .39);
  expect(center.y + center.height / 2).toBeLessThan(762 * .63);

  await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), end + 25);
  await expect.poll(fade).toEqual(faint);

  await scrollInScene(hero, .60);
  await expect(header).toBeVisible();
  await expect.poll(async () => (await header.boundingBox())!.y).toBe(0);
  await expect.poll(heights).toEqual([0, 0, 0, 0, 0, 0]);
  await scrollInScene(hero, .02);
  await expect.poll(async () => (await camera.boundingBox())!.x).toBeCloseTo(start.x, 0);

  await header.locator('a[href="#specifications"]').click();
  await expect(page).toHaveURL(/#specifications$/);
  await expect(specHeading).toBeInViewport();
  await expect.poll(fade).toEqual({ title: 1, dividers: 0 });
  await expect.poll(() => specHeading.evaluate(heading => {
    const bounds = heading.getBoundingClientRect();
    return heading.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
  })).toBe(true);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('.pin-spacer')).toHaveCount(4);
  await expect(page.locator('.hero-stage')).toHaveCSS('margin-bottom', '0px');
  await expect.poll(fade).toEqual({ title: 1, dividers: 0 });

  await page.goto('about:blank');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#specifications');
  await expect(specHeading).toBeInViewport();
  await expect.poll(fade).toEqual({ title: 1, dividers: 0 });
});

test('Specifications cards rise from below in order and align when settled', async ({ page }) => {
  const height = 805;
  await page.setViewportSize({ width: 1470, height });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  const stage = page.locator('.spec-scene');
  const cards = stage.locator('.spec-card');
  await expect(cards.locator('h3')).toHaveText(['Writing System', 'Capture Technology', 'Digital Continuity']);
  const positions = () => cards.evaluateAll(cards => cards.map(card => ({
    top: Math.round(card.getBoundingClientRect().top),
    bottom: Math.round(card.getBoundingClientRect().bottom),
    details: Math.round(card.querySelector('.spec-card-details')!.getBoundingClientRect().top),
  })));

  await scrollInScene(stage, .14);
  await expectPinned(stage);
  await expect.poll(async () => (await positions()).every(card => card.top >= height)).toBe(true);

  await scrollInScene(stage, .26);
  await expect.poll(async () => (await positions()).every(card => card.top < height && card.details >= height)).toBe(true);
  const peek = await positions();
  expect(peek.map(card => card.top)).toEqual([peek[0].top, peek[0].top, peek[0].top]);

  await scrollInScene(stage, .39);
  await expect.poll(async () => (await positions())[0].top).toBeLessThan(peek[0].top - 20);
  const left = await positions();
  expect(left.slice(1)).toEqual(peek.slice(1));
  await expect(cards.first()).toHaveCSS('opacity', '1');

  await scrollInScene(stage, .47);
  await expect.poll(async () => (await positions())[1].top).toBeLessThan(peek[1].top - 15);
  expect((await positions())[2]).toEqual(peek[2]);

  await scrollInScene(stage, .56);
  await expect.poll(async () => (await positions())[2].top).toBeLessThan(peek[2].top - 20);
  const rising = await positions();
  expect(rising[0].top).toBeLessThan(rising[1].top);
  expect(rising[1].top).toBeLessThan(rising[2].top);

  await scrollInScene(stage, .74);
  await expectPinned(stage);
  await expect.poll(async () => {
    const [first, ...remaining] = await positions();
    return first.bottom < height && remaining.every(card => card.top === first.top && card.bottom === first.bottom);
  }).toBe(true);
  for (const panel of await cards.locator('.spec-card-details').all()) await expect(panel).toBeInViewport({ ratio: .99 });

  const controls = stage.getByRole('group', { name: 'specification' });
  const steps = controls.locator('.scene-steps');
  await expect(steps).toHaveCSS('opacity', '0');
  const writing = controls.getByRole('button', { name: 'Writing System' });
  await writing.focus();
  await expect(steps).toHaveCSS('opacity', '1');
  await writing.press('Enter');
  await expect(writing).toHaveAttribute('aria-current', 'step');

  await scrollInScene(stage, .56);
  await expect.poll(positions).toEqual(rising);
  await scrollInScene(stage, .26);
  await expect.poll(positions).toEqual(peek);
});

test('the center-out split hands off to the pinned manifesto and audience fades', async ({ page }) => {
  const width = 1470;
  await page.setViewportSize({ width, height: 805 });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  const specs = page.locator('.spec-scene');
  const bands = specs.locator('.spec-exit-wipe i');
  const thought = page.locator('.thought-intro');
  const manifesto = thought.locator('.manifesto');
  const audience = thought.locator('.audience-intro');
  const letters = manifesto.locator('.highlight-letter');
  const widths = () => bands.evaluateAll(rows => rows.map(row => Math.round(row.getBoundingClientRect().width)));
  const letterOpacity = (index: number) => letters.nth(index).evaluate(letter => Number(getComputedStyle(letter).opacity));
  const leadOpacity = () => audience.evaluate(section => Number(getComputedStyle(section).opacity));

  await expect(bands).toHaveCount(4);
  await scrollInScene(specs, .83);
  await expectPinned(specs);
  await expect.poll(async () => (await widths())[0]).toBeGreaterThan(20);
  const early = await widths();
  expect(early[3]).toBeLessThan(width - 200);
  expect(early[0]).toBeLessThan(early[1]);
  expect(early[1]).toBeLessThan(early[2]);
  expect(early[2]).toBeLessThan(early[3]);
  expect(await bands.evaluateAll(rows => rows.every(row => {
    const { left, right } = row.getBoundingClientRect();
    return Math.abs((left + right) / 2 - innerWidth / 2) < 1;
  }))).toBe(true);

  await scrollInScene(specs, .94);
  await expect.poll(async () => (await widths())[0]).toBeGreaterThan(early[0] + 300);

  await scrollInScene(thought, .02);
  await expectPinned(thought);
  await expect.poll(widths).toEqual([width, width, width, width]);
  await expect(thought).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(manifesto).toHaveCSS('opacity', '0');
  await expect(audience).toHaveCSS('opacity', '0');
  expect(await thought.evaluate(stage => stage.contains(document.elementFromPoint(10, 10)))).toBe(true);

  await scrollInScene(thought, .12);
  await expect.poll(() => manifesto.evaluate(node => Number(getComputedStyle(node).opacity))).toBeGreaterThan(.02);
  expect(await letterOpacity(0)).toBe(.28);
  await expect(audience).toHaveCSS('opacity', '0');

  await scrollInScene(thought, .24);
  await expect.poll(() => letterOpacity(0)).toBeGreaterThan(.28);
  expect(await letterOpacity(0)).toBeGreaterThan(await letterOpacity(3));
  expect(await letterOpacity(-1)).toBe(.28);

  await scrollInScene(thought, .49);
  await expectPinned(thought);
  await expect.poll(leadOpacity).toBeGreaterThan(.1);
  const partialLead = await leadOpacity();
  expect(partialLead).toBeLessThan(.9);
  await expect(manifesto).toHaveCSS('opacity', '1');

  await scrollInScene(thought, .76);
  await expect(audience).toHaveCSS('opacity', '1');
  await expect(letters.last()).toHaveCSS('opacity', '1');

  await scrollInScene(thought, .49);
  await expect.poll(leadOpacity).toBeCloseTo(partialLead, 3);
  await scrollInScene(specs, .83);
  await expect.poll(widths).toEqual(early);

  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('.site-header a[href="#who-its-for"]').click();
  await expect(page).toHaveURL(/#who-its-for$/);
  await expect(audience).toBeInViewport();
  await expect(audience).toHaveCSS('opacity', '1');
  await page.goto('about:blank');
  await page.goto('/#who-its-for');
  await expect(audience).toBeInViewport();
  await expect(audience).toHaveCSS('opacity', '1');
});

test('audience profiles slide in order and the pen zoom gives way to Smartpaper', async ({ page }) => {
  const width = 1470;
  const height = 805;
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  const articles = page.locator('.audience-list article');
  const about = page.locator('#about');
  const panel = about.locator('.about-panel');
  const paper = page.locator('#smartpaper');
  const leftEdges = () => articles.evaluateAll(rows => rows.map(row => Math.round(row.getBoundingClientRect().left)));
  const pageTop = (locator: Locator) => locator.evaluate(element => element.getBoundingClientRect().top + scrollY);
  const scroll = (top: number) => page.evaluate(top => scrollTo({ top, behavior: 'instant' }), top);
  const opacity = () => panel.evaluate(element => Number(getComputedStyle(element).opacity));

  const start = (await pageTop(articles.first())) - height * .62;
  await scroll(start - 5);
  await expect.poll(async () => (await leftEdges()).every(left => left >= width)).toBe(true);
  const hidden = await leftEdges();

  await scroll(start + height * .085);
  await expect.poll(async () => (await leftEdges())[0]).toBeLessThan(width - 20);
  expect((await leftEdges()).slice(1)).toEqual(hidden.slice(1));

  await scroll(start + height * .20);
  await expect.poll(async () => (await leftEdges())[1]).toBeLessThan(hidden[1] - 20);
  const secondEntry = await leftEdges();
  expect(secondEntry[0]).toBeLessThan(secondEntry[1]);
  expect(secondEntry[2]).toBe(hidden[2]);

  await scroll(start + height * .32);
  await expect.poll(async () => (await leftEdges())[2]).toBeLessThan(hidden[2] - 10);
  await scroll(start + height * .70);
  await expect.poll(async () => new Set(await leftEdges()).size).toBe(1);
  expect((await leftEdges())[0]).toBeLessThan(width * .70);
  await scroll(start + height * .20);
  await expect.poll(leftEdges).toEqual(secondEntry);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

  const aboutTop = await pageTop(about);
  await scroll(aboutTop - height * .76);
  await expect.poll(async () => (await panel.boundingBox())!.x).toBeGreaterThan(width * .45);
  const thumbnail = (await panel.boundingBox())!;
  expect(thumbnail.width).toBeLessThan(width * .55);

  await scroll(aboutTop + height * .05);
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(width * .90);
  const fullFrame = (await panel.boundingBox())!;
  expect(fullFrame.x + fullFrame.width / 2).toBeCloseTo(width / 2, 0);
  expect(Math.abs(fullFrame.y + fullFrame.height / 2 - height / 2)).toBeLessThan(3);
  await expect(panel).toHaveCSS('opacity', '1');

  await scroll(aboutTop + height * 1.02);
  await expect.poll(opacity).toBeLessThan(.65);
  expect(await opacity()).toBeGreaterThan(.4);
  expect((await panel.boundingBox())!.width).toBeLessThan(fullFrame.width - 150);
  await expect(paper).toBeInViewport();
  expect(await paper.evaluate(section => section.contains(document.elementFromPoint(innerWidth / 2, innerHeight * .80)))).toBe(true);

  await scroll(aboutTop + height * .05);
  await expect(panel).toHaveCSS('opacity', '1');
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeCloseTo(fullFrame.width, 0);

  await page.goto('about:blank');
  await page.goto('/#about');
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(width * .90);
  await expect(panel).toBeInViewport();
});

test('the pinned Smartpaper heading fades into dividers and a stepped notebook reveal', async ({ page }) => {
  const height = 805;
  await page.setViewportSize({ width: 1470, height });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  const stage = page.locator('#smartpaper');
  const title = stage.locator('.section-title');
  const notebook = stage.locator('.paper-slide').first();
  const panels = stage.locator('.paper-entry-wipe i');
  const dividers = () => panels.evaluateAll(nodes => nodes.slice(0, -1).map(node =>
    Number(getComputedStyle(node).getPropertyValue('--paper-divider'))));
  const panelTops = () => panels.evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)));
  const opacity = (locator: Locator) => locator.evaluate(node => Number(getComputedStyle(node).opacity));
  const { start } = await scrollInScene(stage, 0);
  const seek = (offset: number) => page.evaluate(top => scrollTo({ top, behavior: 'instant' }), start + offset * height);

  await expect(panels).toHaveCount(6);
  await expectPinned(stage);
  await expect(title).toHaveCSS('opacity', '1');
  const titleY = (await title.boundingBox())!.y;

  await seek(.09);
  await expect.poll(() => opacity(title)).toBeLessThan(.8);
  const fadedTitle = await opacity(title);
  expect(fadedTitle).toBeGreaterThan(.2);
  expect((await title.boundingBox())!.y).toBeCloseTo(titleY, 0);

  await seek(.334);
  await expect(title).toHaveCSS('opacity', '0');
  await expect.poll(async () => (await dividers())[4]).toBeGreaterThan(.45);
  const rules = await dividers();
  expect(rules[0]).toBe(0);
  expect(rules[3]).toBeGreaterThan(.08);
  expect(rules[3]).toBeLessThan(rules[4]);
  await expect(notebook).toHaveCSS('opacity', '0');

  await seek(.67);
  await expect.poll(dividers).toEqual([1, 1, 1, 1, 1]);
  expect(await panelTops()).toEqual([0, 0, 0, 0, 0, 0]);

  await seek(.955);
  await expect.poll(() => opacity(notebook)).toBeGreaterThan(.5);
  const reveal = await panelTops();
  const notebookFade = await opacity(notebook);
  expect(notebookFade).toBeLessThan(.85);
  expect(reveal[0]).toBeGreaterThan(reveal[1]);
  expect(reveal[1]).toBeGreaterThan(reveal[2]);
  expect(reveal[2]).toBeGreaterThan(reveal[3]);
  expect(reveal[3]).toBeGreaterThan(reveal[4]);
  expect(reveal[4]).toBeGreaterThan(reveal[5]);

  await seek(1.08);
  await expect.poll(() => opacity(notebook)).toBeGreaterThan(notebookFade + .1);
  expect((await panelTops())[5]).toBeGreaterThan(300);
  await seek(1.32);
  await expectPinned(stage);
  await expect(notebook).toHaveCSS('opacity', '1');
  await expect.poll(panelTops).toEqual(Array(6).fill(height));
  await expect(stage.getByRole('group', { name: 'Smartpaper chapter' })).toBeVisible();

  await seek(.955);
  await expect.poll(panelTops).toEqual(reveal);
  await expect.poll(() => opacity(notebook)).toBeCloseTo(notebookFade, 3);
  await seek(.09);
  await expect.poll(() => opacity(title)).toBeCloseTo(fadedTitle, 3);

  await page.goto('about:blank');
  await page.goto('/#smartpaper');
  await expect(stage).toBeInViewport();
  await expect(title).toHaveCSS('opacity', '1');
});

test('Smartpaper scales the chapter images, keeps the glass captions, and fades to black in order', async ({ page }) => {
  const height = 805;
  await page.setViewportSize({ width: 1470, height });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  const stage = page.locator('#smartpaper');
  const slides = stage.locator('.paper-slide');
  const startingImage = slides.first().locator('.artwork');
  const nextImage = slides.nth(1).locator('.artwork');
  const startingTitle = slides.first().locator('.paper-title');
  const nextTitle = slides.nth(1).locator('.paper-title');
  const firstCaption = slides.first().locator('.paper-caption');
  const controls = stage.getByRole('group', { name: 'Smartpaper chapter' });
  const opacity = (locator: Locator) => locator.evaluate(node => Number(getComputedStyle(node).opacity));
  const { start } = await scrollInScene(stage, 0);
  const seek = (offset: number) => page.evaluate(top => scrollTo({ top, behavior: 'instant' }), start + offset * height);

  await seek(1.59);
  await expectPinned(stage);
  await expect(controls.getByRole('button')).toHaveCount(4);
  const captionHeading = (await firstCaption.locator('h4').boundingBox())!;
  const captionBody = (await firstCaption.locator('p').boundingBox())!;
  expect(captionBody.y - captionHeading.y - captionHeading.height).toBeCloseTo(1);
  expect(captionBody.width).toBeCloseTo(captionHeading.width);

  await seek(2.00);
  await expect.poll(() => opacity(startingImage)).toBeLessThan(.9);
  expect(await opacity(nextImage)).toBeGreaterThan(.08);
  expect((await startingImage.boundingBox())!.width).toBeLessThan(1470 * .96);
  const enteringWidth = (await nextImage.boundingBox())!.width;
  expect(enteringWidth).toBeGreaterThan(1470 * 1.1);
  await expect(startingTitle).toHaveCSS('opacity', '1');
  await expect(nextTitle).toBeHidden();

  await seek(2.06);
  await expect(startingTitle).toBeHidden();
  await expect(nextTitle).toHaveCSS('opacity', '1');
  await expect(controls.locator('[aria-current]')).toHaveAccessibleName('For you, it’s just a blank sheet');
  expect((await nextImage.boundingBox())!.width).toBeLessThan(enteringWidth);
  expect(await opacity(nextImage)).toBeLessThan(1);

  await seek(3.35);
  const glass = slides.nth(2).locator('.paper-caption');
  await expect(glass.getByRole('heading', { name: 'AI-powered structure' })).toBeVisible();
  for (const child of ['h4', 'p']) {
    await expect(glass.locator(child)).toHaveCSS('backdrop-filter', 'blur(24px)');
    await expect(glass.locator(child)).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.055)');
  }

  const finalTitle = slides.last().locator('.paper-title');
  const finalCaption = slides.last().locator('.paper-caption');
  const finalImage = slides.last().locator('.artwork');
  const intro = page.locator('.box-intro');
  const circle = intro.locator('.section-title');
  const collapsedCircle = 'circle(0% at 50% 50%)';
  const sliderCoversBottom = () => stage.evaluate(node => node.contains(document.elementFromPoint(innerWidth / 2, innerHeight - 12)));

  await seek(4.23);
  await expect(controls.locator('[aria-current]')).toHaveAccessibleName('Your notes. Already there.');
  await expect(controls).toHaveCSS('opacity', '1');
  await expect.poll(sliderCoversBottom).toBe(true);

  await seek(4.59);
  await expect.poll(() => opacity(controls)).toBeLessThan(.95);
  expect(await opacity(controls)).toBeGreaterThan(.05);
  await expect(finalTitle).toHaveCSS('opacity', '1');
  await expect(finalCaption).toHaveCSS('opacity', '1');
  await expect(finalImage).toHaveCSS('opacity', '1');

  await seek(4.70);
  await expect(controls).toBeHidden();
  await expect.poll(() => opacity(finalTitle)).toBeLessThan(.95);
  expect(await opacity(finalTitle)).toBeGreaterThan(.05);
  await expect(finalCaption).toHaveCSS('opacity', '1');
  await expect(finalImage).toHaveCSS('opacity', '1');

  await seek(4.83);
  await expect(finalTitle).toHaveCSS('opacity', '0');
  await expect.poll(() => opacity(finalCaption)).toBeLessThan(.95);
  expect(await opacity(finalCaption)).toBeGreaterThan(.05);
  await expect(finalImage).toHaveCSS('opacity', '1');

  await seek(4.985);
  await expect(finalCaption).toHaveCSS('opacity', '0');
  await expect.poll(() => opacity(finalImage)).toBeLessThan(.95);
  const fadingImage = await opacity(finalImage);
  expect(fadingImage).toBeGreaterThan(.05);
  await expectPinned(stage);

  await seek(5.095);
  await expect(finalImage).toHaveCSS('opacity', '0');
  await expect(stage.locator('.paper-story')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expectPinned(stage);
  await expect.poll(sliderCoversBottom).toBe(true);
  await expect(circle).toHaveCSS('clip-path', collapsedCircle);

  await seek(5.19);
  await expectPinned(intro);
  await expect(intro).toBeVisible();
  await expect(circle).not.toHaveCSS('clip-path', collapsedCircle);

  await seek(4.985);
  await expectPinned(stage);
  await expect.poll(sliderCoversBottom).toBe(true);
  await expect.poll(() => opacity(finalImage)).toBeCloseTo(fadingImage, 3);
  await expect(circle).toHaveCSS('clip-path', collapsedCircle);

  await seek(4.23);
  await expectPinned(stage);
  await expect(finalTitle).toHaveCSS('opacity', '1');
  await expect(finalCaption).toHaveCSS('opacity', '1');
  await expect(finalImage).toHaveCSS('opacity', '1');
  await expect(controls.locator('[aria-current]')).toHaveAccessibleName('Your notes. Already there.');
});

test('Inside the box fades in within the circle and reveals the kit before its caption', async ({ page }) => {
  const height = 805;
  await page.setViewportSize({ width: 1470, height });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);

  const intro = page.locator('.box-intro');
  const title = intro.locator('#box-heading');
  const circle = intro.locator('.section-title');
  const kit = page.locator('.box-set');
  const caption = kit.locator('.box-item-copy');
  const radius = () => circle.evaluate(node => parseFloat(getComputedStyle(node).clipPath.slice(7)));
  const opacity = (target: Locator) => target.evaluate(node => Number(getComputedStyle(node).opacity));
  const shutter = () => kit.evaluate(node => parseFloat(getComputedStyle(node).getPropertyValue('--box-shutter')));
  const { end: paperEnd } = await scrollInScene(page.locator('#smartpaper'), .99);
  const { start, end } = await scrollInScene(intro, .084);

  expect(Math.abs(start - paperEnd)).toBeLessThan(2);
  await expectPinned(intro);
  await expect.poll(radius).toBeGreaterThan(0);
  expect(await radius()).toBeLessThan(4);
  await expect(title).toHaveCSS('opacity', '0');

  await scrollInScene(intro, .44);
  await expect.poll(radius).toBeGreaterThan(55);
  expect(await radius()).toBeLessThan(Math.SQRT1_2 * 100);
  await expect.poll(() => opacity(title)).toBeGreaterThan(.04);
  const fadingTitle = await opacity(title);
  expect(fadingTitle).toBeLessThan(.18);
  const titleTop = (await title.boundingBox())!.y;

  await scrollInScene(intro, .92);
  await expect(title).toHaveCSS('opacity', '1');
  await expectPinned(intro);
  expect((await title.boundingBox())!.y).toBeCloseTo(titleTop, 0);

  await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), end + 205);
  await expect.poll(async () => (await title.boundingBox())!.y).toBeLessThan(titleTop - 180);

  const kitTop = await kit.evaluate(node => node.getBoundingClientRect().top + scrollY);
  const seekKit = (inset: number) => page.evaluate(top => scrollTo({ top, behavior: 'instant' }), kitTop - height * inset);
  await seekKit(.735);
  await expect.poll(shutter).toBeLessThan(.75);
  const narrowBands = await shutter();
  expect(narrowBands).toBeGreaterThan(.55);
  await expect(caption).toHaveCSS('opacity', '0');

  await seekKit(.58);
  await expect.poll(shutter).toBeLessThan(narrowBands - .2);
  expect(await shutter()).toBeGreaterThan(0);
  await expect(caption).toHaveCSS('opacity', '0');

  await seekKit(.21);
  await expect.poll(shutter).toBe(0);
  await expect.poll(() => opacity(caption)).toBeGreaterThan(.4);
  expect(await opacity(caption)).toBeLessThan(1);
  await seekKit(.11);
  await expect(caption).toHaveCSS('opacity', '1');

  await seekKit(.735);
  await expect.poll(shutter).toBeCloseTo(narrowBands, 3);
  await expect(caption).toHaveCSS('opacity', '0');
  await scrollInScene(intro, .44);
  await expectPinned(intro);
  await expect.poll(() => opacity(title)).toBeCloseTo(fadingTitle, 3);

  await page.goto('about:blank');
  await page.goto('/#inside-the-box');
  await expect(title).toBeInViewport();
  await expect(title).toHaveCSS('opacity', '1');
});

test('the box overview fills in order and the adapter fades between its two photos', async ({ page }) => {
  const height = 805;
  await page.setViewportSize({ width: 1470, height });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);

  const overview = page.locator('.box-overview');
  const letters = overview.locator('.highlight-letter');
  const cards = page.locator('.box-items .box-item');
  const adapter = cards.nth(1);
  const captions = page.locator('.box-items .box-item-copy');
  const alternate = adapter.locator('.box-item-alternate');
  const topOf = (target: Locator) => target.evaluate(node => node.getBoundingClientRect().top + scrollY);
  const scrollToInset = (top: number, inset: number) => page.evaluate(top => scrollTo({ top, behavior: 'instant' }), top - inset * height);
  const shutters = () => cards.evaluateAll(items => items.map(item => Number(getComputedStyle(item).getPropertyValue('--box-shutter'))));
  const overviewTop = await topOf(overview);
  const cardsTop = await topOf(cards.first());

  await scrollToInset(overviewTop, .91);
  await expect(letters.first()).toHaveCSS('opacity', '0.15');
  await expect(letters.last()).toHaveCSS('opacity', '0.15');
  await scrollToInset(overviewTop, .52);
  await expect(letters.first()).toHaveCSS('opacity', '1');
  await expect(letters.last()).toHaveCSS('opacity', '0.15');
  expect(await letters.evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).opacity === '1').length / nodes.length)).toBeGreaterThan(.4);
  await scrollToInset(overviewTop, .22);
  await expect(letters.last()).toHaveCSS('opacity', '1');

  await scrollToInset(cardsTop, .61);
  await expect.poll(async () => (await shutters()).every(value => value > .15 && value < .62)).toBe(true);
  const reveal = await shutters();
  expect(reveal[0]).toBeCloseTo(reveal[1], 3);
  for (const caption of await captions.all()) await expect(caption).toHaveCSS('opacity', '0');

  await scrollToInset(cardsTop, .115);
  await expect.poll(shutters).toEqual([0, 0]);
  for (const caption of await captions.all()) await expect(caption).toHaveCSS('opacity', '1');
  await expect(alternate).toHaveCSS('opacity', '0');
  await expect(alternate).toHaveCSS('transition-property', 'opacity');
  await expect.poll(() => alternate.locator('img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  await adapter.hover({ position: { x: 140, y: 320 } });
  await expect(alternate).toHaveCSS('opacity', '1');
  await expect(captions.last()).toHaveCSS('opacity', '1');
  await page.mouse.move(5, 5);
  await expect(alternate).toHaveCSS('opacity', '0');
  await page.keyboard.press('Tab');
  await adapter.focus();
  await expect(alternate).toHaveCSS('opacity', '1');

  await scrollToInset(cardsTop, .61);
  await expect.poll(shutters).toEqual(reveal);
  for (const caption of await captions.all()) await expect(caption).toHaveCSS('opacity', '0');
  await scrollToInset(overviewTop, .91);
  await expect(letters.first()).toHaveCSS('opacity', '0.15');
});

test('the product detail gallery responds to scroll and the blue photo loops on its own', async ({ page }) => {
  const height = 805;
  await page.setViewportSize({ width: 1470, height });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);

  const gallery = page.locator('.box-callouts');
  const figures = gallery.locator('.box-detail');
  const finishes = figures.nth(1);
  const finishesArtwork = finishes.locator('.artwork');
  await expect(gallery).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  const { gap, imageOffsets } = await gallery.evaluate(section => {
    const cards = section.previousElementSibling!.querySelector('.box-items')!;
    const bottom = cards.getBoundingClientRect().bottom;
    return {
      gap: section.getBoundingClientRect().top - bottom,
      imageOffsets: Array.from(cards.querySelectorAll('img'), img => img.getBoundingClientRect().bottom - bottom),
    };
  });
  expect(gap).toBeCloseTo(41, 0);
  for (const offset of imageOffsets) expect(offset).toBeCloseTo(0, 0);

  const frames = await figures.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { top: rect.top + scrollY, bottom: rect.bottom + scrollY, x: rect.x, width: rect.width };
  }));
  expect(frames[0].top).toBeCloseTo(frames[1].top, 0);
  expect(frames[2].bottom).toBeCloseTo(frames[1].bottom, 0);
  expect(frames[2].x + frames[2].width).toBeCloseTo(frames[0].x + frames[0].width, 0);
  expect(frames[3].top).toBeGreaterThan(frames[2].bottom);
  expect(frames[4].top).toBeCloseTo(frames[5].top, 0);
  expect(frames[3].width).toBeGreaterThan(frames[4].width);

  const seek = (index: number, inset: number) => page.evaluate(top => scrollTo({ top, behavior: 'instant' }), frames[index].top - height * inset);
  const zoom = (index: number) => figures.nth(index).locator('.artwork').evaluate(node => {
    const transform = getComputedStyle(node).transform;
    return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
  });
  const alpha = (index: number) => (index === 1 ? finishesArtwork : figures.nth(index))
    .evaluate(node => Number(getComputedStyle(node).opacity));
  const fading = (index: number) => expect.poll(async () => {
    const opacity = await alpha(index);
    return opacity > .08 && opacity < .95;
  }).toBe(true);

  await seek(0, .84);
  await expect.poll(() => zoom(0)).toBeGreaterThan(1.2);
  await expect(finishes).toHaveCSS('opacity', '1');
  await expect(finishes).toHaveCSS('border-top-left-radius', '31% 24%');
  await expect(finishesArtwork).toHaveCSS('opacity', '0');
  await expect(finishes.locator('figcaption')).toHaveCSS('opacity', '0');
  await seek(0, .64);
  await fading(1);
  await expect(finishes).toHaveCSS('opacity', '1');
  expect(await zoom(0)).toBeGreaterThan(1.1);
  const firstFade = await alpha(1);
  await seek(0, .18);
  await expect(finishesArtwork).toHaveCSS('opacity', '1');
  await expect(finishes).toHaveCSS('border-top-left-radius', '31% 24%');
  await expect.poll(() => zoom(0)).toBe(1);

  await expect(finishesArtwork).toHaveCSS('animation-iteration-count', 'infinite');
  const scrollBeforeZoom = await readScroll(page);
  await finishesArtwork.evaluate(async node => {
    const [animation] = node.getAnimations();
    await animation.ready;
    animation.currentTime = Number(animation.effect!.getTiming().duration) * .9;
  });
  await expect.poll(() => zoom(1)).toBeGreaterThan(1.28);
  await expect.poll(() => zoom(1)).toBeLessThan(1.07);
  await expect.poll(() => zoom(1)).toBeGreaterThan(1.08);
  expect(await readScroll(page)).toBe(scrollBeforeZoom);

  for (const [index, before, during, after] of [[2, .93, .78, .14], [3, .76, .61, .49], [5, .90, .70, .09]]) {
    await seek(index, before);
    await expect(figures.nth(index)).toHaveCSS('opacity', '0');
    await seek(index, during);
    await fading(index);
    if (index !== 3) expect(await zoom(index)).toBeGreaterThan(1.18);
    if (index === 5) expect(await zoom(4)).toBeGreaterThan(1.18);
    await seek(index, after);
    await expect(figures.nth(index)).toHaveCSS('opacity', '1');
    await expect.poll(() => zoom(index)).toBe(1);
  }
  await expect.poll(() => zoom(4)).toBe(1);

  await seek(5, .70);
  await fading(5);
  await expect.poll(() => zoom(4)).toBeGreaterThan(1.18);
  await seek(0, .64);
  await expect.poll(() => alpha(1)).toBeCloseTo(firstFade, 3);
  await seek(0, .84);
  await expect(finishesArtwork).toHaveCSS('opacity', '0');
  await expect(finishes).toHaveCSS('opacity', '1');
});

test('wheel advances and rewinds the pinned Smartpaper sequence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(6);
  const paper = page.locator('#smartpaper');
  await scrollInScene(paper, .32);
  await expectPinned(paper);
  const controls = page.getByRole('group', { name: 'Smartpaper chapter' });
  await expect(controls.locator('[aria-current]')).toHaveAccessibleName('For the pen, it’s a precise map');
  await page.mouse.move(340, 430);
  await page.mouse.wheel(0, 730);
  await expect(controls.locator('[aria-current]')).toHaveAccessibleName('For you, it’s just a blank sheet');
  await expectPinned(paper);
  await expect(page.locator('html')).not.toHaveClass(/lenis-smooth/);
  await page.mouse.wheel(0, -730);
  await expect(controls.locator('[aria-current]')).toHaveAccessibleName('For the pen, it’s a precise map');
  await expectPinned(paper);
});

test('touch moves the document through a pinned finish and back', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('.pin-spacer')).toHaveCount(4);
    const finishes = page.locator('.finish-frame');
    await scrollInScene(finishes, .03);
    const controls = page.getByRole('group', { name: 'pen finish' });
    const input = await context.newCDPSession(page);
    await input.send('Input.synthesizeScrollGesture', { x: 195, y: 560, yDistance: -315, speed: 500, gestureSourceType: 'touch' });
    await expect(controls.locator('[aria-current]')).toHaveAccessibleName('Graphite Black.');
    await expectPinned(finishes);
    await input.send('Input.synthesizeScrollGesture', { x: 195, y: 290, yDistance: 285, speed: 500, gestureSourceType: 'touch' });
    await expect(controls.locator('[aria-current]')).toHaveAccessibleName('Impossible to');
  } finally {
    await context.close();
  }
});

test('every pinned chapter selector brings its content into view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(4);

  const chapters = [
    { stage: '.spec-scene', label: 'specification', count: 3 },
    { stage: '.paper-story', label: 'Smartpaper chapter', count: 4 },
    { stage: '.finish-frame', label: 'pen finish', count: 5 },
  ];

  for (const chapter of chapters) {
    const stage = page.locator(chapter.stage);
    await scrollInScene(stage, .14);
    const controls = stage.getByRole('group', { name: chapter.label });
    const selectors = controls.locator('.scene-steps button');
    await expect(selectors).toHaveCount(chapter.count);

    for (let index = chapter.count - 1; index >= 0; index--) {
      const button = selectors.nth(index);
      const label = await button.getAttribute('aria-label');
      await button.click();
      await expect(button).toHaveAttribute('aria-current', 'step');
      await expectPinned(stage);
      await expect(stage.getByRole('heading', { name: label!, exact: true })).toBeInViewport();
    }
  }
});

test('mobile navigation and the order dialog support keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.click();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await nav.getByRole('link', { name: 'Specifications' }).click();
  await expect(page).toHaveURL(/#specifications$/);
  await expect(nav).toBeHidden();
  await expect(page.locator('.spec-scene')).toBeInViewport();

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const order = page.getByRole('button', { name: /Order Nota One/ });
  await order.click();
  const dialog = page.getByRole('dialog', { name: 'Stay ahead' });
  const email = dialog.getByRole('textbox', { name: 'E-mail' });
  await expect(email).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(email).toBeFocused();
  await dialog.getByRole('button', { name: 'Notify me' }).click();
  await expect(email).toBeFocused();
  expect(await email.evaluate(input => (input as HTMLInputElement).validity.valueMissing)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(order).toBeFocused();
});

test('reduced motion exposes every chapter without pinning', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  for (const label of ['Writing System', 'Capture Technology', 'Digital Continuity', 'AI-powered structure', 'Your notes. Already there.', 'Inside the box', 'A complete, ready-to-use set', 'Bright Orange.']) {
    await expect(page.getByRole('heading', { name: label })).toBeVisible();
  }
  await expect(page.getByRole('group', { name: 'pen finish' })).toBeHidden();
  await expect(page.locator('.box-overview .highlight-letter').first()).toHaveCSS('opacity', '1');
  for (const figure of await page.locator('.box-detail').all()) await expect(figure).toHaveCSS('opacity', '1');
  await expect(page.locator('.box-detail').nth(1).locator('.artwork')).toHaveCSS('animation-name', 'none');
});
