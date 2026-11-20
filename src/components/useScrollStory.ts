'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { attachHeroMotion } from '@/lib/hero-motion';

export const compactPageQuery = '(width <= 1024px), (width <= 1366px) and (pointer: coarse)';
export const desktopMotionQuery = '(width > 1024px) and ((width > 1366px) or (not (pointer: coarse))) and (prefers-reduced-motion: no-preference)';

export type Scene = 'specifications' | 'paper' | 'finishes';
type Chapter = { trigger: ScrollTrigger; first: number; last: number; count: number };

export function useScrollStory(root: RefObject<HTMLDivElement | null>, initialFinish: number, menuOpen: boolean) {
  const chapters = useRef<Partial<Record<Scene, Chapter>>>({});
  const lenis = useRef<Lenis | null>(null);
  const syncHeaderColor = useRef<(() => void) | null>(null);
  const [active, setActive] = useState<Record<Scene, number>>({ specifications: 0, paper: 0, finishes: initialFinish });

  useLayoutEffect(() => {
    const page = root.current;
    if (!page) return;
    gsap.registerPlugin(ScrollTrigger);

    const select = (selector: string) => page.querySelector<HTMLElement>(selector)!;
    const progress = select('.page-progress');
    const hero = select('.hero');
    const header = select('.site-header');
    const headerControls = Array.from(header.querySelectorAll<HTMLElement>(
      ':scope > :is(.brand, .mobile-toggle, .mobile-order), :scope > .header-navigation a',
    ));
    const main = select('#main');
    const specSection = select('#specifications');
    const audience = select('#who-its-for');
    const about = select('#about');
    const smartpaper = select('#smartpaper');
    const boxSection = select('#inside-the-box');
    const footer = select('.footer');
    const compact = window.matchMedia(compactPageQuery);
    const pinnedHero = window.matchMedia(desktopMotionQuery);
    const wipes = [
      { stage: hero, panels: [...hero.querySelectorAll('.scene-wipe i')], light: true },
      { stage: specSection, panels: [...specSection.querySelectorAll('.spec-exit-wipe i')], light: false },
      { stage: smartpaper, panels: [...smartpaper.querySelectorAll('.paper-entry-wipe i')], light: true },
    ];
    // Keep the header visible through the hero's pen pullback.
    const headerExitPosition = () => pinnedHero.matches
      ? hero.offsetHeight * 1.57
      : hero.offsetHeight - window.innerHeight * .18;
    let headerExit = headerExitPosition();
    let previousHeaderScroll = 0;

    const isLightSurface = (x: number, y: number) => {
      const surface = document.elementsFromPoint(x, y).find(element => {
        if (!main.contains(element)) return false;
        const fadingPanel = element.closest('.about-panel, .finish-slide');
        return !fadingPanel || Number(getComputedStyle(fadingPanel).opacity) >= .5;
      });
      if (!surface) return false;

      // Wipes use pointer-events: none, so check their painted bounds separately.
      const wipe = wipes.find(({ stage }) => stage.contains(surface));
      if (wipe?.panels.some(panel => {
        const { left, right, top, bottom } = panel.getBoundingClientRect();
        return x >= left && x < right && y >= top && y < bottom;
      })) return wipe.light;
      return surface === main || Boolean(surface.closest(
        '.spec-scene, .about-panel, #smartpaper > .section-title, .box-intro .section-title, .box-contents, .finish-slide.dark-text',
      ));
    };
    const updateHeaderColor = () => {
      if (header.classList.contains('menu-open') || page.querySelector('.inquiry-dialog[open]')) return;
      // Sample where each control settles, including when the header is sliding into view.
      const { top: headerTop, bottom } = header.getBoundingClientRect();
      if (bottom <= 0 && header.matches('[data-hidden]:not(:has(:focus-visible))')) return;
      const light = headerControls.map(control => {
        const { left, top, width, height } = control.getBoundingClientRect();
        return width > 0 && height > 0 && isLightSurface(left + width / 2, top + height / 2 - headerTop);
      });
      headerControls.forEach((control, index) => control.toggleAttribute('data-light-surface', light[index]));
    };
    syncHeaderColor.current = updateHeaderColor;
    let headerColorFrame = 0;
    const scheduleHeaderColor = () => {
      if (headerColorFrame) return;
      headerColorFrame = requestAnimationFrame(() => {
        headerColorFrame = 0;
        updateHeaderColor();
      });
    };
    const updateScroll = () => {
      scheduleHeaderColor();
      if (compact.matches) return;
      const scroller = document.scrollingElement!;
      const distance = scroller.scrollHeight - scroller.clientHeight;
      const scroll = distance > 0 ? gsap.utils.clamp(0, distance, window.scrollY) : 0;
      const ratio = distance > 0 ? scroll / distance : 0;
      progress.style.setProperty('--progress', String(ratio));

      const pastHero = scroll > headerExit;
      const movement = scroll - previousHeaderScroll;
      if (!pastHero || Math.abs(movement) >= 8) {
        header.toggleAttribute('data-hidden', pastHero && movement > 0);
        previousHeaderScroll = scroll;
      }
    };
    const updateViewport = () => {
      headerExit = headerExitPosition();
      footer.toggleAttribute('data-sticky', pinnedHero.matches && footer.offsetHeight <= window.innerHeight);
      if (compact.matches) {
        header.removeAttribute('data-hidden');
        previousHeaderScroll = window.scrollY;
      }
      updateScroll();
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    header.addEventListener('focusin', scheduleHeaderColor);
    ScrollTrigger.addEventListener('refresh', updateViewport);

    const media = gsap.matchMedia(page);
    let refreshFrame = 0;
    let disposed = false;
    let pendingAnchor = [specSection, audience, about, smartpaper, boxSection].find(section => location.hash === `#${section.id}`);
    let pendingAnchorTop: number | undefined;
    const refresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        if (pendingAnchor && pinnedHero.matches) {
          const top = pendingAnchorTop ?? pendingAnchor.getBoundingClientRect().top + window.scrollY;
          if (top > window.scrollY) window.scrollTo({ top, behavior: 'instant' });
        }
        pendingAnchor = undefined;
        lenis.current?.resize();
        updateScroll();
      });
    };

    media.add(desktopMotionQuery, () => {
      const smooth = new Lenis({
        lerp: 0.13,
        smoothWheel: true,
        syncTouch: false,
        prevent: node => node.classList.contains('paper-caption') && node.scrollHeight > node.clientHeight,
      });
      lenis.current = smooth;
      smooth.on('scroll', ScrollTrigger.update);
      const tick = (time: number) => smooth.raf(time * 1000);
      gsap.ticker.add(tick);

      const pin = (stage: HTMLElement, travel: number | `${number}%`, onRefresh?: (trigger: ScrollTrigger) => void) => gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: typeof travel === 'number' ? () => `+=${Math.round(stage.offsetHeight * travel)}` : `+=${travel}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
          onRefresh,
        },
      });

      // Navigate to the readable frame of a pinned section.
      const positionAnchor = (anchor: HTMLElement, trigger: ScrollTrigger, time: number, inset = 0) => {
        const duration = trigger.animation?.duration();
        if (!duration) return;
        const distance = Math.ceil((trigger.end - trigger.start) * time / duration);
        anchor.style.scrollMarginTop = `${inset - distance}px`;
        if (anchor === pendingAnchor) pendingAnchorTop = trigger.start + distance;
      };

      // Keep the controls and screen-reader state tied to the same timeline as the artwork.
      const track = (name: Scene, timeline: gsap.core.Timeline, count: number, first: number, last: number) => {
        const trigger = timeline.scrollTrigger!;
        chapters.current[name] = { trigger, first, last, count };
        const sync = () => {
          const fraction = gsap.utils.clamp(0, 1, (timeline.progress() - first) / (last - first));
          const index = Math.round(fraction * (count - 1));
          setActive(current => current[name] === index ? current : { ...current, [name]: index });
        };
        timeline.eventCallback('onUpdate', sync);
        sync();
      };

      function pinHero() {
        const heroStage = select('.hero-stage');
        const camera = select('.hero-camera');
        const travel = 2.54;
        const wipeStart = 1.70;
        // Bring the specifications in at pin release, where the white panels fill the view.
        gsap.set(heroStage, { '--hero-overlap': 'calc(0px - var(--hero-height))' });
        const heroMotion = pin(hero, travel)
          .set(heroStage, { zIndex: 1 }, 0)
          .set(heroStage, { zIndex: 0 }, travel);

        if (camera.querySelector('.hero-profile')) {
          // Frame the nib by viewport position and the complete pen by viewport width.
          const pose = (nib: number, width: number, drop: number) => {
            const scale = () => hero.clientWidth * width / (1.9055 * camera.offsetWidth);
            return {
              scale,
              x: () => hero.clientWidth * nib - camera.offsetLeft - camera.offsetWidth * .047 * scale(),
              y: () => hero.offsetHeight * drop,
            };
          };
          heroMotion
            .to(camera, { ...pose(.18, 1.54, .003), duration: .29, ease: 'power1.in' }, .18)
            .to(camera, { ...pose(-.087, 1.56, .017), duration: .47 }, .47)
            .to(camera, { ...pose(-.073, 1.20, .011), duration: .29, ease: 'power1.inOut' }, .94)
            .to(camera, { ...pose(.034, .956, .002), duration: .51, ease: 'sine.inOut' }, 1.23)
            .to(camera, { '--hero-profile-blend': 1, duration: .30, ease: 'power1.inOut' }, .34);
        } else {
          heroMotion
            .to(camera, { xPercent: -13, scale: 1.16, duration: .76, ease: 'power1.in' }, .18)
            .to(camera, { xPercent: -5, scale: 1.02, duration: .80, ease: 'power1.out' }, .94);
        }

        heroMotion
          .to(hero, { '--hero-shade': .46, duration: .49, ease: 'power1.inOut' }, .22)
          .to(hero, { '--hero-shade': 0, duration: .86, ease: 'power1.out' }, .71)
          .to(hero, { '--hero-shade': .40, duration: .54, ease: 'power1.inOut' }, 1.82)
          .to(hero.querySelectorAll('.scene-wipe i'), {
            scaleY: 1, stagger: .081, duration: .41, ease: 'power1.inOut',
          }, wipeStart);

        const motion = hero.querySelector<HTMLElement>('.hero-motion');
        const source = motion?.dataset.source;
        if (motion && source) return attachHeroMotion(motion, source, heroMotion, wipeStart);
      }
      const detachHeroMotion = pinHero();

      const specs = select('.spec-scene');
      const groups = Array.from(specs.querySelectorAll<HTMLElement>('.spec-card'));
      const revealEnd = .18;
      gsap.set(specSection, { '--spec-overlap': 'calc(0px - var(--spec-height))' });
      const specMotion = pin(specs, 3.02, trigger => positionAnchor(specSection, trigger, revealEnd));
      const specPen = select('.spec-pen');
      const cardRise = { start: 1.26, stagger: .38, settle: 2.70 };
      const firstSpec = (cardRise.start + cardRise.settle) / 2;
      const lastSpec = cardRise.settle;
      const specExit = lastSpec + .39;
      const title = select('.spec-scene .section-title');
      const cards = select('.spec-cards');
      const belowStage = (card: HTMLElement) => specs.clientHeight - cards.offsetTop - card.offsetTop + 1;
      const titleDelay = .025;
      specMotion
        .set(specSection, { zIndex: 1 }, .02)
        .fromTo(select('.spec-intro-lines'), { opacity: 1 }, {
          opacity: 0, duration: .115, ease: 'power2.out',
        }, 0)
        .fromTo(title, { y: () => (specs.offsetHeight - title.offsetHeight) / 2, opacity: 0 }, {
          opacity: 1, duration: revealEnd - titleDelay, ease: 'sine.inOut',
        }, titleDelay)
        .to(title, { y: 0, duration: 1.03, ease: 'power1.inOut' }, .29)
        .fromTo(specPen, { yPercent: 100 }, { yPercent: 0, duration: 1.35, ease: 'power1.inOut' }, .14)
        .fromTo(groups, { y: (_, card: HTMLElement) => belowStage(card) }, {
          y: (_, card: HTMLElement) => belowStage(card) - Math.min(specs.clientHeight * .096, card.querySelector('h3')!.offsetHeight),
          duration: .31, ease: 'power1.inOut',
        }, .63);
      // Each column starts later and covers the remaining distance by the same scroll point.
      groups.forEach((group, index) => {
        const start = cardRise.start + index * cardRise.stagger;
        specMotion.to(group, { y: 0, duration: cardRise.settle - start, ease: 'power1.inOut' }, start);
      });
      const controls = specs.querySelector('.scene-controls');
      if (controls) specMotion.fromTo(controls, { autoAlpha: 0 }, { autoAlpha: 1, duration: .24 }, firstSpec - .24);
      specMotion.to({}, { duration: .28 }, specExit);
      const bands = specs.querySelectorAll('.spec-exit-wipe i');
      const timings = [
        { delay: .14, duration: .88 },
        { delay: .09, duration: .84 },
        { delay: .05, duration: .71 },
        { delay: 0, duration: .61 },
      ];
      bands.forEach((band, index) => {
        const { delay, duration } = timings[index];
        specMotion.fromTo(band, { scaleX: 0 }, { scaleX: 1, duration, ease: 'power1.inOut' }, specExit + delay);
      });
      specMotion.set(specSection, { zIndex: 0 }, specMotion.duration());
      track('specifications', specMotion, groups.length, firstSpec / specMotion.duration(), lastSpec / specMotion.duration());

      const manifesto = select('.manifesto');
      const letters = manifesto.querySelectorAll('.highlight-letter');
      const brighten = { opacity: 1, stagger: { amount: .52 }, duration: .027, ease: 'power1.inOut' };
      const thought = select('.thought-intro');
      pin(thought, '115%', trigger => positionAnchor(audience, trigger, .83, audience.offsetTop))
        .to({}, { duration: 1.15 }, 0)
        .fromTo(manifesto, { opacity: 0 }, { opacity: 1, duration: .25, ease: 'power1.in' }, .043)
        .fromTo(letters, { opacity: .28 }, brighten, .268)
        .fromTo(audience, { opacity: 0 }, { opacity: 1, duration: .45, ease: 'power1.inOut' }, .30);

      const articles = select('.audience-list').querySelectorAll('article');
      const slideTime = .40;
      const stagger = .135;
      gsap.set(articles, { xPercent: 110 });
      gsap.to(articles, {
        xPercent: 0, duration: slideTime, stagger, ease: 'sine.inOut',
        scrollTrigger: {
          trigger: articles[0], start: 'top 62%',
          end: () => `+=${Math.round(window.innerHeight * (slideTime + stagger * (articles.length - 1)))}`,
          scrub: true, invalidateOnRefresh: true,
        },
      });

      const panel = select('.about-panel');
      const aboutScreens = 1.8;
      const sceneHeight = () => about.offsetHeight / aboutScreens;
      const thumbnail = .50;
      gsap.set(about, { '--about-screens': aboutScreens });
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: about, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true,
        },
      })
        .fromTo(panel, {
          scale: thumbnail,
          opacity: 1,
          x: () => panel.offsetWidth * (1 - thumbnail) / 2,
          y: () => (panel.offsetHeight * thumbnail - sceneHeight()) / 2,
        }, { x: 0, y: 0, scale: 1, duration: .86, ease: 'sine.inOut' }, .14)
        // Counter the document scroll so the white section can pass over the centered pen.
        .to(panel, { y: () => about.offsetHeight - sceneHeight() * .04, duration: aboutScreens }, 1)
        .to(panel, { scale: .69, opacity: .24, duration: 1.47, ease: 'sine.inOut' }, 1.22)
        .to(panel, { opacity: 0, duration: .11 }, '>');

      function pinPaper() {
        const story = select('.paper-story');
        const slides = Array.from(story.querySelectorAll<HTMLElement>('.paper-slide'));
        const artwork = slides.map(slide => slide.querySelector('.artwork')!);
        const copy = slides.map(slide => slide.querySelectorAll('.chapter-copy'));
        const controls = story.querySelector('.scene-controls');
        const first = 1.59;
        const step = .88;
        const last = first + (slides.length - 1) * step;
        const distance = last + .88;
        const timeline = pin(smartpaper, distance, trigger => {
          if (pendingAnchor === smartpaper) pendingAnchorTop = trigger.start;
        });
        const panels = Array.from(story.querySelectorAll('.paper-entry-wipe i'));
        const dividers = panels.slice(0, -1).reverse();
        const panelStarts = [.72, .78, .835, .88, .925, .97];
        const panelEnd = 1.17;
        timeline
          .to(select('#smartpaper > .section-title'), { opacity: 0, duration: .20 }, 0)
          .to(dividers, { '--paper-divider': 1, duration: .19, stagger: .05, ease: 'sine.inOut' }, .23)
          .fromTo(slides[0], { autoAlpha: 0 }, { autoAlpha: 1, duration: .43, ease: 'power1.out' }, .76)
          .fromTo(controls, { autoAlpha: 0 }, { autoAlpha: 1, duration: .12 }, panelEnd);
        // Start at the left and let all six panels clear the stage together.
        panels.forEach((panel, index) => {
          const start = panelStarts[index];
          timeline.to(panel, { yPercent: 100, duration: panelEnd - start, ease: 'sine.inOut' }, start);
        });
        artwork.slice(1).forEach((image, index) => {
          const midpoint = first + (index + .5) * step;
          const blend = .17;
          const swap = .028;
          timeline
            .to(artwork[index], { scale: .62, autoAlpha: 0, duration: blend, ease: 'sine.inOut' }, midpoint - blend / 2)
            .fromTo(image, { scale: 1.40, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: blend, ease: 'sine.inOut' }, midpoint - blend / 2)
            .to(copy[index], { autoAlpha: 0, duration: swap }, midpoint - swap / 2)
            .fromTo(copy[index + 1], { autoAlpha: 0 }, { autoAlpha: 1, duration: swap }, midpoint - swap / 2);
        });
        timeline.to({}, { duration: distance }, 0);
        const finalSlide = slides.at(-1)!;
        const imageFade = .16;
        timeline
          .to(controls, { autoAlpha: 0, duration: .10, ease: 'power1.inOut' }, last + .32)
          .to(finalSlide.querySelector('.paper-title'), { autoAlpha: 0, duration: .105, ease: 'power1.inOut' }, '>')
          .to(finalSlide.querySelector('.paper-caption'), { autoAlpha: 0, duration: .16, ease: 'power1.out' }, '>')
          .to(artwork.at(-1)!, { autoAlpha: 0, duration: imageFade, ease: 'power2.out' }, '>')
          .to(story, { backgroundColor: '#000', duration: imageFade, ease: 'power2.out' }, '<');
        track('paper', timeline, slides.length, first / timeline.duration(), last / timeline.duration());
      }

      function revealBox() {
        const stage = select('.box-intro');
        const title = select('.box-intro .section-title');
        const circleEnd = .58;
        const titleStart = .43;
        const titleEnd = 1.11;
        const travel = 1.25;
        // Align the pins and hide the overlapping box section until its pin takes over.
        gsap.set(boxSection, { '--box-overlap': 'calc(0px - var(--box-intro-height))' });
        pin(stage, travel, trigger => positionAnchor(boxSection, trigger, titleEnd))
          .to({}, { duration: travel }, 0)
          .fromTo(boxSection, { visibility: 'hidden' }, { visibility: 'visible', duration: circleEnd }, 0)
          .fromTo(title, { clipPath: 'circle(0% at 50% 50%)' }, {
            clipPath: 'circle(72% at 50% 50%)', duration: circleEnd, ease: 'power1.in',
          }, 0)
          .fromTo(title.children, { opacity: 0 }, {
            opacity: 1, duration: titleEnd - titleStart, ease: 'sine.inOut',
          }, titleStart);

        for (const panel of boxSection.querySelectorAll('.box-item')) {
          gsap.timeline({
            scrollTrigger: { trigger: panel, start: 'top bottom', end: 'top 12%', scrub: true },
          })
            .fromTo(panel, { '--box-shutter': 1 }, { '--box-shutter': 0, duration: .81, ease: 'sine.inOut' })
            .fromTo(panel.querySelector('.box-item-copy'), { opacity: 0 }, {
              opacity: 1, duration: .19, ease: 'power1.out',
            });
        }
      }

      function revealDetailGallery() {
        const figures = boxSection.querySelectorAll('.box-detail');
        const motions: { zoom?: [scale: number, start: string, end: string]; fade?: [start: string, end: string] }[] = [
          { zoom: [1.26, 'top 88%', 'top 23%'] },
          { fade: ['top 78%', 'top 49%'] },
          { zoom: [1.32, 'top 84%', 'top 16%'], fade: ['top 89%', 'top 69%'] },
          { fade: ['top 71%', 'top 52%'] },
          { zoom: [1.35, 'top 75%', 'top 12%'], fade: ['top 80%', 'top 41%'] },
          { zoom: [1.35, 'top 75%', 'top 12%'], fade: ['top 86%', 'top 56%'] },
        ];

        motions.forEach(({ zoom, fade }, index) => {
          const figure = figures[index];
          if (!figure) return;
          if (zoom) {
            const [scale, start, end] = zoom;
            gsap.fromTo(figure.querySelector('.artwork'), { scale }, {
              scale: 1, ease: 'none', scrollTrigger: { trigger: figure, start, end, scrub: true },
            });
          }
          if (fade) {
            const [start, end] = fade;
            // Keep the finishes card's rounded frame visible during its content fade.
            const targets = index === 1 ? figure.querySelectorAll('.artwork, figcaption') : figure;
            gsap.fromTo(targets, { opacity: 0 }, {
              opacity: 1, ease: 'sine.inOut', scrollTrigger: { trigger: figure, start, end, scrub: true },
            });
          }
        });
      }

      function pinFinishes() {
        const stage = select('.finish-frame');
        const slides = Array.from(stage.querySelectorAll<HTMLElement>('.chapter-slide'));
        const last = slides.length - 1;
        const timeline = pin(stage, Math.max(1, last) * .79);
        slides.slice(1).forEach((slide, offset) => {
          const index = offset + 1;
          const previous = slides[offset];
          timeline
            .to(previous.querySelectorAll('.chapter-copy'), { autoAlpha: 0, y: -12, duration: .21 }, index - .78)
            .fromTo(slide, { autoAlpha: 0 }, { autoAlpha: 1, duration: .43 }, index - .74)
            .set(previous, { autoAlpha: 0 }, index - .29)
            .fromTo(slide.querySelectorAll('.chapter-copy'), { autoAlpha: 0, y: 13 }, { autoAlpha: 1, y: 0, duration: .29 }, index - .54);
        });
        timeline.to({}, { duration: .08 }, last);
        track('finishes', timeline, slides.length, 0, Math.max(.01, last / timeline.duration()));
      }

      pinPaper();
      revealBox();
      const overview = select('.box-overview');
      gsap.fromTo(overview.querySelectorAll('.highlight-letter'), { opacity: .15 }, {
        opacity: 1, duration: .04, stagger: { amount: .96 }, ease: 'none',
        scrollTrigger: { trigger: overview, start: 'top 85%', end: 'top 23%', scrub: true },
      });
      revealDetailGallery();
      pinFinishes();
      updateScroll();

      return () => {
        detachHeroMotion?.();
        specSection.style.removeProperty('scroll-margin-top');
        audience.style.removeProperty('scroll-margin-top');
        boxSection.style.removeProperty('scroll-margin-top');
        pendingAnchorTop = undefined;
        chapters.current = {};
        lenis.current = null;
        gsap.ticker.remove(tick);
        smooth.off('scroll', ScrollTrigger.update);
        smooth.destroy();
      };
    });

    const layout = new ResizeObserver(refresh);
    layout.observe(page);
    document.fonts.ready.then(() => { if (!disposed) refresh(); });
    refresh();
    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      layout.disconnect();
      window.removeEventListener('scroll', updateScroll);
      header.removeEventListener('focusin', scheduleHeaderColor);
      ScrollTrigger.removeEventListener('refresh', updateViewport);
      media.revert();
      cancelAnimationFrame(headerColorFrame);
      header.removeAttribute('data-hidden');
      headerControls.forEach(control => control.removeAttribute('data-light-surface'));
      syncHeaderColor.current = null;
      footer.removeAttribute('data-sticky');
    };
  }, [root]);

  useLayoutEffect(() => {
    syncHeaderColor.current?.();
  }, [active.finishes, menuOpen]);

  function goToScene(name: Scene, index: number) {
    const chapter = chapters.current[name];
    if (!chapter) {
      setActive(current => ({ ...current, [name]: index }));
      return;
    }
    const { trigger, first, last, count } = chapter;
    const fraction = gsap.utils.clamp(0, 1, index / Math.max(1, count - 1));
    const progress = first + (last - first) * fraction;
    const top = trigger.start + (trigger.end - trigger.start) * progress;
    lenis.current?.scrollTo(top, { immediate: true });
  }

  function setScrollLocked(locked: boolean) {
    if (locked) lenis.current?.stop();
    else lenis.current?.start();
  }

  return { active, goToScene, setScrollLocked };
}
