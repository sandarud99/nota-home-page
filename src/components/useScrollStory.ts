'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export type Scene = 'specifications' | 'paper' | 'finishes';
type Chapter = { trigger: ScrollTrigger; first: number; last: number; count: number };

export function useScrollStory(root: RefObject<HTMLDivElement | null>) {
  const chapters = useRef<Partial<Record<Scene, Chapter>>>({});
  const lenis = useRef<Lenis | null>(null);
  const [active, setActive] = useState<Record<Scene, number>>({ specifications: 0, paper: 0, finishes: 0 });

  useLayoutEffect(() => {
    const page = root.current;
    if (!page) return;
    gsap.registerPlugin(ScrollTrigger);

    const select = (selector: string) => page.querySelector<HTMLElement>(selector)!;
    const progress = select('.page-progress');
    const updateProgress = () => {
      const scroller = document.scrollingElement!;
      const distance = scroller.scrollHeight - scroller.clientHeight;
      const ratio = distance > 0 ? gsap.utils.clamp(0, 1, window.scrollY / distance) : 0;
      progress.style.setProperty('--progress', String(ratio));
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    ScrollTrigger.addEventListener('refresh', updateProgress);

    const media = gsap.matchMedia(page);
    let refreshFrame = 0;
    let disposed = false;
    const refresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        updateProgress();
      });
    };

    media.add({
      desktop: '(min-width: 992px)',
      mobile: '(width < 992px)',
      reduced: '(prefers-reduced-motion: reduce)',
    }, ({ conditions }) => {
      if (conditions?.reduced) {
        refresh();
        return;
      }
      const mobile = Boolean(conditions?.mobile);
      const smooth = new Lenis({ lerp: 0.16, smoothWheel: true, syncTouch: false });
      lenis.current = smooth;
      smooth.on('scroll', ScrollTrigger.update);
      const tick = (time: number) => smooth.raf(time * 1000);
      gsap.ticker.add(tick);

      const pin = (stage: HTMLElement, travel: number) => gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: () => `+=${Math.round(stage.offsetHeight * travel)}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

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

      const hero = select('.hero');
      const heroMotion = pin(hero, mobile ? .19 : 2.14)
        .to(hero.querySelector('.hero-pen'), {
          xPercent: mobile ? 0 : -11, yPercent: mobile ? -19 : 1,
          scale: mobile ? 1.06 : 1.15, duration: mobile ? 1 : 1.47,
        }, 0);
      if (mobile) {
        heroMotion.to(hero.querySelector('.hero-title'), { y: -14, duration: 1 }, 0);
      } else {
        heroMotion
          .to(hero.querySelector('.hero-title'), { y: -25, autoAlpha: 0, duration: .4 }, .95)
          .to(hero.querySelector('.site-header'), { autoAlpha: 0, duration: .27 }, 1.08)
          .fromTo(hero.querySelectorAll('.scene-wipe i'), { scaleY: 0 }, { scaleY: 1, stagger: .06, duration: .24 }, 1.16);
      }

      const specs = select('.spec-scene');
      const groups = Array.from(specs.querySelectorAll<HTMLElement>('.spec-card'));
      const specMotion = pin(specs, (mobile ? .50 : .97) * Math.max(1, groups.length - 1));
      specMotion.fromTo(specs.querySelector('.spec-pen'), { yPercent: mobile ? 16 : 44 }, { yPercent: 0, duration: .65 }, 0);
      const firstSpec = mobile ? .16 : .53;
      const lastSpec = Math.max(firstSpec, groups.length - 1) + .22;
      if (mobile) {
        groups.forEach((group, index) => {
          if (index === 0) return;
          specMotion
            .to(groups[index - 1], { autoAlpha: 0, y: -12, duration: .22 }, index - .55)
            .fromTo(group, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .27 }, index - .36);
        });
      } else {
        groups.forEach((group, index) => {
          specMotion.fromTo(group, { y: 35, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .53 }, index * .52);
        });
      }
      specMotion.to({}, { duration: .28 }, lastSpec);
      if (!mobile) specMotion.fromTo(specs.querySelectorAll('.scene-wipe i'), { scaleY: 0 }, { scaleY: 1, stagger: { each: .043, from: 'center' }, duration: .21 }, lastSpec + .05);
      track('specifications', specMotion, groups.length, firstSpec / specMotion.duration(), (lastSpec - .17) / specMotion.duration());

      const manifesto = select('.manifesto');
      pin(manifesto, mobile ? .19 : .87).fromTo(
        manifesto.querySelectorAll('.manifesto-word'),
        { opacity: .28 },
        { opacity: 1, stagger: .018, duration: .1 },
      );

      const about = select('.about-visual');
      if (!mobile) {
        gsap.fromTo(about.querySelector('.about-panel'), { scale: .82 }, { scale: 1, duration: .62, scrollTrigger: {
          trigger: about, start: 'top bottom', end: 'top top', scrub: true,
        } });
      }

      function pinDeck(name: 'paper' | 'finishes', className: string, screens: number, circle = false) {
        const stage = select(className);
        const slides = Array.from(stage.querySelectorAll<HTMLElement>('.chapter-slide'));
        const intro = circle && !mobile ? .44 : 0;
        const last = intro + slides.length - 1;
        const timeline = pin(stage, Math.max(1, slides.length - 1) * screens + (circle && !mobile ? .53 : 0));
        if (intro) {
          timeline.fromTo(stage.querySelectorAll('.scene-wipe i'), { scaleY: 1 }, {
            scaleY: 0, stagger: .04, duration: .20,
          }, 0);
        }
        slides.slice(1).forEach((slide, offset) => {
          const index = intro + offset + 1;
          const previous = slides[offset];
          timeline
            .to(previous.querySelectorAll('.chapter-copy'), { autoAlpha: 0, y: -12, duration: .21 }, index - .78)
            .fromTo(slide, { autoAlpha: 0 }, { autoAlpha: 1, duration: .43 }, index - .74)
            .set(previous, { autoAlpha: 0 }, index - .29)
            .fromTo(slide.querySelectorAll('.chapter-copy'), { autoAlpha: 0, y: 13 }, { autoAlpha: 1, y: 0, duration: .29 }, index - .54);
        });
        timeline.to({}, { duration: .08 }, last);
        if (circle && !mobile) {
          timeline.fromTo(stage.querySelector('.paper-wipe'), { clipPath: 'circle(0% at 50% 50%)' }, {
            clipPath: 'circle(76% at 50% 50%)', duration: .37,
          }, last + .11);
        }
        track(name, timeline, slides.length, intro / timeline.duration(), Math.max(.01, last / timeline.duration()));
      }

      pinDeck('paper', '.paper-story', mobile ? .52 : 1.25, true);
      pinDeck('finishes', '.finish-frame', mobile ? .42 : .79);
      updateProgress();

      return () => {
        chapters.current = {};
        lenis.current = null;
        gsap.ticker.remove(tick);
        smooth.off('scroll', ScrollTrigger.update);
        smooth.destroy();
      };
    });

    page.addEventListener('load', refresh, true);
    document.fonts.ready.then(() => { if (!disposed) refresh(); });
    refresh();
    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      page.removeEventListener('load', refresh, true);
      window.removeEventListener('scroll', updateProgress);
      ScrollTrigger.removeEventListener('refresh', updateProgress);
      media.revert();
    };
  }, [root]);

  function goToScene(name: Scene, index: number) {
    const chapter = chapters.current[name];
    if (!chapter) return;
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
