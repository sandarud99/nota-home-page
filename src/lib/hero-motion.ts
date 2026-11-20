import type { gsap } from 'gsap';
import type { AnimationItem } from 'lottie-web';

export function attachHeroMotion(container: HTMLElement, source: string, timeline: gsap.core.Timeline, duration: number) {
  const request = new AbortController();
  let animation: AnimationItem | undefined;
  let displayedFrame = -1;

  const reset = () => {
    delete container.dataset.frame;
    displayedFrame = -1;
    const player = animation;
    animation = undefined;
    player?.destroy();
  };

  const fail = () => {
    reset();
    container.setAttribute('data-load-failed', '');
  };

  const seek = () => {
    const player = animation;
    if (!player?.isLoaded || player.totalFrames < 1) return;
    const progress = Math.min(1, timeline.time() / duration);
    const frame = Math.round(progress * (player.totalFrames - 1));
    if (frame === displayedFrame) return;
    player.goToAndStop(frame, true);
    if (animation === player) {
      displayedFrame = frame;
      container.dataset.frame = String(frame);
    }
  };

  const size = new ResizeObserver(() => animation?.resize());
  size.observe(container);
  timeline.eventCallback('onUpdate', seek);

  void Promise.all([
    import('lottie-web/build/player/lottie_light_canvas'),
    fetch(source, { signal: request.signal }).then(async response => {
      if (!response.ok) throw new Error('Hero animation failed to load.');
      const data = await response.json();
      if (!Array.isArray(data?.layers) || !data.layers.length ||
          !(data.w > 0 && data.h > 0 && data.fr > 0 && data.op > data.ip) || data.segments?.length ||
          data.assets?.some((asset: { p?: string }) => asset.p && !/^data:image\/(webp|png|jpeg|gif);base64,/.test(asset.p))) {
        throw new Error('Use a standalone Lottie file with embedded images.');
      }
      return data;
    }),
  ]).then(([{ default: lottie }, animationData]) => {
    if (request.signal.aborted) return;
    animation = lottie.loadAnimation({
      container,
      renderer: 'canvas',
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
      animationData,
      autoplay: false,
      loop: false,
    });
    animation.addEventListener('DOMLoaded', seek);
    animation.addEventListener('data_failed', fail);
    animation.addEventListener('error', fail);
    seek();
  }).catch(() => {
    if (!request.signal.aborted) fail();
  });

  return () => {
    request.abort();
    size.disconnect();
    timeline.eventCallback('onUpdate', null);
    reset();
    container.removeAttribute('data-load-failed');
  };
}
