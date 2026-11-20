'use client';

import { Fragment, useEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react';
import { ArrowLeft, ArrowRight, Grip, X } from 'lucide-react';
import { mediaUrl, safeHref } from '@/lib/strapi';
import type { Artwork, BoxItemContent, FormCopy, Heading, Homepage } from '@/lib/strapi';
import { useHeroIntro } from './useHeroIntro';
import { compactPageQuery, desktopMotionQuery, useScrollStory } from './useScrollStory';

const phoneImageQuery = '(width < 600px)';

function ImageView({ artwork, className = '', eager = false, fallback, mobileMedia = compactPageQuery }: {
  artwork: Artwork;
  className?: string;
  eager?: boolean;
  fallback?: string;
  mobileMedia?: string | false;
}) {
  const source = mediaUrl(artwork.image, artwork.imageUrl);
  const mobile = mediaUrl(artwork.mobileImage, artwork.mobileImageUrl);
  const [failed, setFailed] = useState<string[]>([]);
  const image = source && !failed.includes(source) ? source : fallback;
  const mobileSource = mobileMedia && mobile && !failed.includes(mobile) ? mobile : undefined;
  return <picture className={`artwork ${className}`}>
    {mobileSource && mobileMedia && <source media={mobileMedia} srcSet={mobileSource}
      width={artwork.mobileImage?.width ?? artwork.mobileImageWidth}
      height={artwork.mobileImage?.height ?? artwork.mobileImageHeight} />}
    <img
      src={image}
      alt={artwork.alt ?? artwork.image?.alternativeText ?? ''}
      width={artwork.image?.width ?? artwork.imageWidth}
      height={artwork.image?.height ?? artwork.imageHeight}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={event => {
        const node = event.currentTarget;
        const candidate = mobileSource && node.currentSrc !== node.src ? mobileSource : image;
        if (candidate && candidate !== fallback) setFailed(current => [...current, candidate]);
      }}
    />
  </picture>;
}

function SectionTitle({ id, heading }: { id: string; heading: Heading }) {
  const lines = heading.title.split('\n');
  return <div className="section-title">
    <h2 id={id}>{lines.map((line, i) => <span key={i}>{line}</span>)}</h2>
    {heading.description && <p>{heading.description}</p>}
  </div>;
}

const wipeColumns = 6;

function Wipe({ panels, className = 'scene-wipe' }: { panels: number; className?: string }) {
  return <div className={className} aria-hidden="true">
    {Array.from({ length: panels }, (_, i) => <i key={i} />)}
  </div>;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function IntroText({ text, delay = 0 }: { text: string; delay?: number }) {
  return text.split('\n').map((line, lineIndex) => {
    const letters = Array.from(graphemes.segment(line));
    const interval = Math.min(27, 430 / Math.max(1, letters.length - 1));
    return <Fragment key={lineIndex}>
      {lineIndex > 0 && '\n'}
      {letters.map(({ segment }, i) => /^\s+$/u.test(segment) ? segment :
        <span className="intro-letter" key={i}
          style={{ '--letter-delay': `${delay + lineIndex * 44 + i * interval}ms` } as CSSProperties}>{segment}</span>)}
    </Fragment>;
  });
}

function HighlightText({ text }: { text: string }) {
  return <>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true">
      {text.trim().split(/\s+/).map((word, index) => <Fragment key={index}>
        {index > 0 && ' '}
        <span className="highlight-word">
          {Array.from(graphemes.segment(word), ({ segment }, i) => <span className="highlight-letter" key={i}>{segment}</span>)}
        </span>
      </Fragment>)}
    </span>
  </>;
}

function Manifesto({ text }: { text: string }) {
  return <section className="manifesto" aria-label="Our philosophy">
    <p className="manifesto-words"><HighlightText text={text} /></p>
  </section>;
}

function SceneControls({ index, titles, label, select, arrows = true }: {
  index: number;
  titles: string[];
  label: string;
  select: (index: number) => void;
  arrows?: boolean;
}) {
  if (titles.length < 2) return null;
  return <div className="scene-controls" role="group" aria-label={label}>
    {arrows && <button type="button" className="scene-arrow" aria-label={`Previous ${label}`}
      aria-disabled={index === 0} onClick={() => index > 0 && select(index - 1)}>
      <ArrowLeft size={17} aria-hidden="true" />
    </button>}
    <div className="scene-steps">
      {titles.map((title, i) => <button type="button" key={i} aria-label={title}
        aria-current={i === index ? 'step' : undefined} onClick={() => select(i)}><span /></button>)}
    </div>
    {arrows && <button type="button" className="scene-arrow" aria-label={`Next ${label}`}
      aria-disabled={index === titles.length - 1} onClick={() => index < titles.length - 1 && select(index + 1)}>
      <ArrowRight size={17} aria-hidden="true" />
    </button>}
  </div>;
}

function InquiryModal({ copy, opener, close }: { copy: FormCopy; opener: HTMLElement; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const panel = dialog.current!;
    panel.showModal();
    email.current?.focus({ preventScroll: true });
    return () => {
      panel.close();
      opener.focus({ preventScroll: true });
    };
  }, [opener]);

  useEffect(() => {
    if (saved) closeButton.current?.focus({ preventScroll: true });
  }, [saved]);

  async function dismiss() {
    const panel = dialog.current;
    if (!panel || panel.hasAttribute('data-closing')) return;
    panel.setAttribute('data-closing', '');
    // Keep the dialog modal and hold the scroll lock through the exit transition.
    await Promise.allSettled(panel.getAnimations({ subtree: true }).map(animation => animation.finished));
    if (dialog.current === panel) close();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || dialog.current?.hasAttribute('data-closing')) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setSending(true);
    setFeedback('');
    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.status === 201) setSaved(true);
      else setFeedback(response.status === 429 ? copy.retryMessage : copy.errorMessage);
    } catch {
      setFeedback(copy.errorMessage);
    } finally {
      setSending(false);
    }
  }

  return <dialog ref={dialog} className="inquiry-dialog" aria-labelledby="inquiry-title"
    aria-describedby={saved ? undefined : 'inquiry-description'} data-lenis-prevent
    onCancel={event => { event.preventDefault(); void dismiss(); }}
    onClick={event => { if (event.target === event.currentTarget) void dismiss(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([tabindex="-1"])'));
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }}>
    <div className="dialog-panel">
      <h2 id="inquiry-title">{saved ? copy.successMessage : copy.title}</h2>
      {!saved && <>
        <p id="inquiry-description" className="form-intro">{copy.description}</p>
        <form className="inquiry-form" onSubmit={submit}>
          <label>
            <span className="sr-only">{copy.emailLabel}</span>
            <input type="email" name="email" ref={email} placeholder={copy.emailLabel} required maxLength={254} autoComplete="email" />
          </label>
          <input className="honeypot" aria-hidden="true" type="text" name="website" tabIndex={-1} autoComplete="off" />
          <button type="submit" className="inquiry-submit" disabled={sending}>
            {sending ? copy.sendingLabel : copy.submitLabel}<span aria-hidden="true">•</span>
          </button>
        </form>
      </>}
      <p className={saved ? 'sr-only' : 'form-feedback'} role="status">{saved ? copy.successMessage : feedback}</p>
      <button type="button" className="inquiry-close" ref={closeButton} onClick={dismiss}>{copy.closeLabel}</button>
    </div>
  </dialog>;
}

function BoxItem({ item, className = '', mobileMedia = false }: {
  item: BoxItemContent;
  className?: string;
  mobileMedia?: string | false;
}) {
  const alternate = item.hoverImage || item.hoverImageUrl;
  return <article className={`box-item ${className}`} tabIndex={alternate ? 0 : undefined}>
    <div className="box-item-artwork">
      <ImageView artwork={item} mobileMedia={mobileMedia} fallback="/art/notebook.svg" />
      {alternate && <ImageView artwork={{ image: item.hoverImage, imageUrl: item.hoverImageUrl, alt: '' }}
        className="box-item-alternate" />}
    </div>
    <div className="box-item-copy"><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div>
  </article>;
}

export default function Experience({ data: d }: { data: Homepage }) {
  const page = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inquiryOpener, setInquiryOpener] = useState<HTMLElement | null>(null);
  const { active, goToScene, setScrollLocked } = useScrollStory(page, d.colors.length > 1 ? 1 : 0, menuOpen);
  useHeroIntro(page);
  const orderLabel = `${d.hero.ctaLabel} ${d.hero.priceLabel} • ${d.hero.price}`;
  const uploadedProfile = mediaUrl(d.hero.profileImage);
  const specImage = d.specsArtwork.mobileImage;
  const specProfile = (specImage?.width ?? d.specsArtwork.mobileImageWidth) === 896 &&
    (specImage?.height ?? d.specsArtwork.mobileImageHeight) === 141
    ? mediaUrl(specImage, d.specsArtwork.mobileImageUrl) : undefined;
  const heroProfile = uploadedProfile || specProfile;
  const heroAnimation = d.hero.animationEnabled === false
    ? undefined
    : mediaUrl(d.hero.animation, d.hero.animationUrl ?? '/animations/nota-pen.json');

  useEffect(() => {
    const compact = window.matchMedia(compactPageQuery);
    const closeAtDesktop = () => { if (!compact.matches) setMenuOpen(false); };
    compact.addEventListener('change', closeAtDesktop);
    return () => compact.removeEventListener('change', closeAtDesktop);
  }, []);

  function openInquiry(event: MouseEvent<HTMLElement>) {
    setScrollLocked(true);
    const target = event.currentTarget.querySelector<HTMLElement>('.order-button') ?? event.currentTarget;
    setInquiryOpener(target);
  }

  function closeInquiry() {
    setScrollLocked(false);
    setInquiryOpener(null);
  }

  const orderText = <>{d.hero.ctaLabel} <span>{d.hero.priceLabel}</span><i aria-hidden="true">•</i>{d.hero.price}</>;
  const navigationLinks = (animate = false) => d.navigation.map((link, i) => <a href={safeHref(link.href)} key={link.id ?? i}
    aria-label={animate ? link.label : undefined} onClick={() => setMenuOpen(false)}>
    {animate ? <IntroText text={link.label} delay={Math.min(i, 5) * 47} /> : link.label}
  </a>);

  return <div ref={page} data-intro="loading">
    <div className="hero-preloader" aria-hidden="true"><span>0%</span></div>
    <a className="skip-link" href="#main" inert={menuOpen}>Skip to content</a>
    <div className="page-progress" aria-hidden="true"><i /></div>
    <header className={`site-header ${menuOpen ? 'menu-open' : ''}`}
      onKeyDown={event => {
        if (event.key === 'Escape' && menuOpen && !inquiryOpener) {
          event.preventDefault();
          setMenuOpen(false);
          requestAnimationFrame(() => menuButton.current?.focus({ preventScroll: true }));
        }
      }}>
      <a className="brand" href="#top" aria-label={`${d.brand} home`} onClick={() => setMenuOpen(false)}>{d.headerWordmark}</a>
      <nav className="header-navigation" aria-label="Main navigation">{navigationLinks(true)}</nav>
      <button className="mobile-toggle" ref={menuButton} type="button"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-controls="homepage-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X size={30} aria-hidden="true" /> : <Grip size={28} aria-hidden="true" />}
      </button>
      <div className="menu-panel" id="homepage-navigation" inert={!menuOpen}>
        <nav className="header-navigation" aria-label="Main navigation">{navigationLinks()}</nav>
        <div className="menu-product">
          <ImageView artwork={d.menuArtwork} mobileMedia={phoneImageQuery} />
          <button type="button" className="order-button" onClick={openInquiry}>{orderText}</button>
        </div>
        <div className="menu-credits">
          <span>{d.footerCopyright}</span>
          <div><p>{d.footerProject}</p><p>{d.footerCredit}</p></div>
        </div>
      </div>
      <div className="header-order" onClick={openInquiry}>
        <ImageView artwork={d.brandMark} className="brand-mark" eager />
        <button type="button" className="order-button" aria-label={orderLabel} onClick={openInquiry}>{orderText}</button>
      </div>
      <button type="button" className="mobile-order" aria-label={orderLabel} onClick={openInquiry}>
        <ImageView artwork={d.brandMark} className="brand-mark" eager />
      </button>
    </header>
    <main id="main" tabIndex={-1} inert={menuOpen}>
      <div id="top" className="hero-stage">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-art">
            <div className="hero-camera">
              {heroProfile && <picture key={heroProfile} className={`hero-profile${uploadedProfile ? '' : ' hero-profile--spec'}`}>
                <source media={desktopMotionQuery} srcSet={heroProfile} />
                <img alt="" loading="lazy" decoding="async"
                  ref={image => {
                    if (image?.complete && image.naturalWidth) image.parentElement?.setAttribute('data-ready', '');
                  }}
                  onLoad={event => event.currentTarget.parentElement?.setAttribute('data-ready', '')}
                  onError={event => event.currentTarget.parentElement?.removeAttribute('data-ready')} />
              </picture>}
              <ImageView artwork={d.hero} className="hero-pen" fallback="/art/hero-pen.svg" eager />
            </div>
            {heroAnimation && <div className="hero-motion" data-source={heroAnimation} aria-hidden="true" />}
          </div>
          <h1 id="hero-heading" className="hero-title" aria-label={d.hero.title}><IntroText text={d.hero.title} /></h1>
          <Wipe panels={wipeColumns} />
        </section>
      </div>

      <section id="specifications" aria-labelledby="specs-heading">
        <div className="spec-scene">
          <Wipe panels={wipeColumns} className="spec-intro-lines" />
          <SectionTitle id="specs-heading" heading={d.specsHeading} />
          <ImageView artwork={d.specsArtwork} className="spec-pen" mobileMedia={phoneImageQuery} fallback="/art/pen-transparent.svg" />
          <div className="spec-cards">
            {d.specifications.map((item, i) => <article className="spec-card" key={item.id ?? i}>
              <h3>{item.title}</h3>
              <div className="spec-card-details">
                {item.description && <p>{item.description}</p>}
                <ul>{item.bullets?.map((bullet, j) => <li key={bullet.id ?? j}>{bullet.text}</li>)}</ul>
              </div>
            </article>)}
          </div>
          <SceneControls index={active.specifications} titles={d.specifications.map(item => item.title)} label="specification"
            select={index => goToScene('specifications', index)} />
          <Wipe panels={4} className="spec-exit-wipe" />
        </div>
      </section>

      <div className="thought-section">
        <div className="thought-intro">
          <Manifesto text={d.manifesto} />
          <section id="who-its-for" className="audience audience-intro" aria-labelledby="audience-heading">
            <div>
              <h2 id="audience-heading">{d.audienceHeading.title}</h2>
              {d.audienceHeading.description && <p className="audience-description">{d.audienceHeading.description}</p>}
            </div>
            <p className="audience-lead">{d.audienceIntro}</p>
          </section>
        </div>
        <div className="audience audience-list">
          <div className="audience-copy">
            {d.audiences.map((item, i) => <article key={item.id ?? i}>
              <h3>{item.title}</h3><p>{item.description}</p>
            </article>)}
          </div>
        </div>
        <section id="about" className="about-visual" aria-label={d.aboutArtwork.alt}>
          <div className="about-panel"><ImageView artwork={d.aboutArtwork} mobileMedia={false} fallback="/art/pen-transparent.svg" /></div>
        </section>
      </div>

      <section id="smartpaper" aria-labelledby="paper-heading">
        <SectionTitle id="paper-heading" heading={d.paperHeading} />
        <div className="paper-story">
          {d.paperDetails.map((item, i) => <article className="chapter-slide paper-slide" key={item.id ?? i} data-current={i === active.paper || undefined}>
            <ImageView artwork={item} mobileMedia={phoneImageQuery} fallback="/art/notebook.svg" />
            <h3 className="chapter-copy paper-title">{item.title}</h3>
            <div className="chapter-copy paper-caption">
              <h4>{item.caption}</h4>
              <p>{item.description}</p>
            </div>
          </article>)}
          <SceneControls index={active.paper} titles={d.paperDetails.map(item => item.caption)} label="Smartpaper chapter" arrows={false}
            select={index => goToScene('paper', index)} />
          <Wipe panels={wipeColumns} className="scene-wipe paper-entry-wipe" />
        </div>
      </section>

      <section id="inside-the-box" aria-labelledby="box-heading">
        <div className="box-intro">
          <SectionTitle id="box-heading" heading={d.boxHeading} />
        </div>
        <div className="box-contents">
          <BoxItem item={d.boxSet} className="box-set" mobileMedia={compactPageQuery} />
          <p className="box-overview"><HighlightText text={d.boxProductOverview} /></p>
          <div className="box-items">{d.boxItems.map((item, i) => <BoxItem key={item.id ?? i} item={item} />)}</div>
        </div>
        <div className="box-callouts">
          {d.boxCallouts.map((item, i) => <figure className="box-detail" key={item.id ?? i}>
            <ImageView artwork={item} fallback="/art/pen-transparent.svg" />
            {item.title && <figcaption>{item.title}</figcaption>}
          </figure>)}
        </div>
      </section>

      <section id="finishes" aria-labelledby="finishes-heading"
        aria-describedby={d.colorsHeading.description ? 'finishes-description' : undefined}>
        <h2 className="sr-only" id="finishes-heading">{d.colorsHeading.title}</h2>
        {d.colorsHeading.description && <p className="sr-only" id="finishes-description">{d.colorsHeading.description}</p>}
        <div className="finish-frame">
          {d.colors.map((color, i) => <article key={color.id ?? i} data-current={i === active.finishes || undefined}
            className={`chapter-slide finish-slide ${color.darkText ? 'dark-text' : ''}`}
            style={{ '--scene-tone': /^#[0-9a-f]{6}$/i.test(color.tone) ? color.tone : '#303139' } as CSSProperties}>
            <ImageView artwork={color} fallback="/art/pen-transparent.svg" />
            <div className="chapter-copy finish-caption">
              <h3>{color.title}</h3><p>{color.description}</p>
            </div>
          </article>)}
          <SceneControls index={active.finishes} titles={d.colors.map(item => item.title)} label="pen finish" arrows={false}
            select={index => goToScene('finishes', index)} />
        </div>
      </section>
    </main>

    <footer className="footer" inert={menuOpen}>
      <div className="footer-main">
        <p>{d.footerDescription}</p>
        <nav aria-label="Footer navigation">
          <span>{d.footerNavigationLabel}</span>
          {d.footerLinks.map((link, i) => <a href={safeHref(link.href)} key={link.id ?? i}>{link.label}</a>)}
        </nav>
        <div className="footer-year"><span>{d.footerYearLabel}</span><p>{d.footerYear}</p></div>
      </div>
      <div className="footer-credits"><span>{d.footerCopyright}</span><span>{d.footerProject}</span><span>{d.footerCredit}</span></div>
    </footer>
    <div className="footer-brand" inert={menuOpen}>
      <ImageView artwork={{ ...d.brandMark, alt: '' }} />
      <span>{d.brand}</span>
    </div>
    {inquiryOpener && <InquiryModal copy={d.formCopy} opener={inquiryOpener} close={closeInquiry} />}
  </div>;
}
