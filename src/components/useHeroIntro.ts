'use client';

import { useEffect, type RefObject } from 'react';
import { desktopMotionQuery } from './useScrollStory';

const countDuration = 780;
const assetWaitLimit = 2400;

export function useHeroIntro(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const loader = page.querySelector<HTMLElement>('.hero-preloader');
    const count = loader?.querySelector('span');
    if (!loader || !count) return;
    const animated = window.matchMedia('(scripting: enabled) and (prefers-reduced-motion: no-preference)');
    if (!animated.matches || getComputedStyle(loader).visibility === 'hidden') {
      delete page.dataset.intro;
      return;
    }

    page.dataset.intro = 'loading';
    count.textContent = '0%';
    const desktop = window.matchMedia(desktopMotionQuery);
    const pen = page.querySelector('.hero-motion');
    const images = Array.from(page.querySelectorAll<HTMLImageElement>('.hero-pen img, .brand-mark img'))
      .filter(image => image.getClientRects().length > 0);
    let assetsReady = false;
    void Promise.allSettled([document.fonts.ready, ...images.map(image => image.decode())])
      .then(() => { assetsReady = true; });

    const start = performance.now();
    let frame = 0;
    let finished = false;
    const finish = () => {
      finished = true;
      cancelAnimationFrame(frame);
      delete page.dataset.intro;
      page.removeEventListener('focusin', finish);
      animated.removeEventListener('change', finish);
    };

    const tick = (now: number) => {
      const elapsed = Math.max(0, now - start);
      const penReady = !pen || !desktop.matches || pen.matches('[data-frame], [data-load-failed]');
      if (elapsed >= assetWaitLimit || (elapsed >= countDuration && assetsReady && penReady)) {
        count.textContent = '100%';
        page.dataset.intro = 'revealing';
        const targets = page.querySelectorAll<HTMLElement>('.hero-preloader, .hero-art, .hero-title, .site-header');
        const animations = Array.from(targets, target => target.getAnimations({ subtree: true })).flat();
        void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
          if (!finished) finish();
        });
        return;
      }
      const percentage = Math.min(97, Math.floor(100 * (1 - Math.exp(-elapsed / 220))));
      const value = `${percentage}%`;
      if (count.textContent !== value) count.textContent = value;
      frame = requestAnimationFrame(tick);
    };

    page.addEventListener('focusin', finish);
    animated.addEventListener('change', finish);
    frame = requestAnimationFrame(tick);
    return finish;
  }, [root]);
}
