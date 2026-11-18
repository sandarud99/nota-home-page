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
      await expect(page.locator('.pin-spacer')).toHaveCount(5);
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
      await scrollInScene(hero, .24);
      await expectPinned(hero);
      const movedPen = await page.locator('.hero-pen').evaluate(node => (node as HTMLElement).style.transform);
      await scrollInScene(hero, .02);
      await expect.poll(() => page.locator('.hero-pen').evaluate(node => (node as HTMLElement).style.transform)).not.toBe(movedPen);

      const specs = page.locator('.spec-scene');
      await scrollInScene(specs, .2);
      await expectPinned(specs);

      const paper = page.locator('.paper-story');
      const paperBounds = await scrollInScene(paper, .07);
      await expectPinned(paper);
      const paperControls = page.getByRole('group', { name: 'Smartpaper chapter' });
      await expect(paperControls.locator('[aria-current]')).toHaveAccessibleName('For the pen, it’s a precise map');
      const first = await readScroll(page);
      await paperControls.getByRole('button', { name: 'Next Smartpaper chapter' }).click();
      await expect(paperControls.locator('[aria-current]')).toHaveAccessibleName('For you, it’s just a blank sheet');
      expect(await readScroll(page)).toBeGreaterThan(first);
      await expectPinned(paper);
      await paperControls.getByRole('button', { name: 'Previous Smartpaper chapter' }).click();
      await expect(paperControls.locator('[aria-current]')).toHaveAccessibleName('For the pen, it’s a precise map');
      await expect.poll(() => readScroll(page)).toBeLessThan(paperBounds.start + (paperBounds.end - paperBounds.start) * .15);

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

test('wheel advances and rewinds the pinned Smartpaper sequence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.pin-spacer')).toHaveCount(5);
  const paper = page.locator('.paper-story');
  await scrollInScene(paper, .14);
  await expectPinned(paper);
  const controls = page.getByRole('group', { name: 'Smartpaper chapter' });
  await expect(controls.locator('[aria-current]')).toHaveAccessibleName('For the pen, it’s a precise map');
  await page.mouse.move(340, 430);
  await page.mouse.wheel(0, 970);
  await expect(controls.locator('[aria-current]')).toHaveAccessibleName('For you, it’s just a blank sheet');
  await expectPinned(paper);
  await expect(page.locator('html')).not.toHaveClass(/lenis-smooth/);
  await page.mouse.wheel(0, -970);
  await expect(controls.locator('[aria-current]')).toHaveAccessibleName('For the pen, it’s a precise map');
  await expectPinned(paper);
});

test('touch moves the document through a pinned finish and back', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('.pin-spacer')).toHaveCount(5);
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
  await expect(page.locator('.pin-spacer')).toHaveCount(5);

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
  for (const label of ['Writing System', 'Capture Technology', 'Digital Continuity', 'AI-powered structure', 'Your notes. Already there.', 'Bright Orange.']) {
    await expect(page.getByRole('heading', { name: label })).toBeVisible();
  }
  await expect(page.getByRole('group', { name: 'pen finish' })).toBeHidden();
});
