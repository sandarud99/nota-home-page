'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Grip, X } from 'lucide-react';
import { mediaUrl, safeHref } from '@/lib/strapi';
import type { Artwork, FormCopy, Heading, Homepage, SectionItem } from '@/lib/strapi';
import { useScrollStory } from './useScrollStory';

function ImageView({ artwork, className = '', eager = false, fallback }: {
  artwork: Artwork;
  className?: string;
  eager?: boolean;
  fallback?: string;
}) {
  const source = mediaUrl(artwork.image, artwork.imageUrl);
  const mobile = mediaUrl(artwork.mobileImage, artwork.mobileImageUrl);
  const [failed, setFailed] = useState<string[]>([]);
  const image = source && !failed.includes(source) ? source : fallback;
  const mobileSource = mobile && !failed.includes(mobile) ? mobile : undefined;
  return <picture className={`artwork ${className}`}>
    {mobileSource && <source media="(width < 992px)" srcSet={mobileSource}
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

function Wipe() {
  return <div className="scene-wipe" aria-hidden="true">
    {Array.from({ length: 7 }, (_, i) => <i key={i} />)}
  </div>;
}

function SceneControls({ index, titles, label, select }: {
  index: number;
  titles: string[];
  label: string;
  select: (index: number) => void;
}) {
  if (titles.length < 2) return null;
  return <div className="scene-controls" role="group" aria-label={label}>
    <button type="button" className="scene-arrow" aria-label={`Previous ${label}`}
      aria-disabled={index === 0} onClick={() => index > 0 && select(index - 1)}>
      <ArrowLeft size={17} aria-hidden="true" />
    </button>
    <div className="scene-steps">
      {titles.map((title, i) => <button type="button" key={i} aria-label={title}
        aria-current={i === index ? 'step' : undefined} onClick={() => select(i)}><span /></button>)}
    </div>
    <button type="button" className="scene-arrow" aria-label={`Next ${label}`}
      aria-disabled={index === titles.length - 1} onClick={() => index < titles.length - 1 && select(index + 1)}>
      <ArrowRight size={17} aria-hidden="true" />
    </button>
  </div>;
}

function InquiryModal({ copy, close }: { copy: FormCopy; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const panel = dialog.current!;
    const opener = document.activeElement as HTMLElement | null;
    panel.showModal();
    email.current?.focus({ preventScroll: true });
    return () => {
      panel.close();
      opener?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (saved) closeButton.current?.focus();
  }, [saved]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
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

  return <dialog ref={dialog} className="inquiry-dialog" aria-labelledby="inquiry-title" data-lenis-prevent
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([tabindex="-1"]), textarea'));
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
      <h2 id="inquiry-title">{copy.title}</h2>
      {saved ? <p className="form-success" role="status">{copy.successMessage}</p> : <>
        <p className="form-intro">{copy.description}</p>
        <form className="inquiry-form" onSubmit={submit}>
          <label><span>{copy.emailLabel}</span><input type="email" name="email" ref={email} required maxLength={254} autoComplete="email" /></label>
          <label><span>{copy.nameLabel}</span><input type="text" name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
          <label><span>{copy.messageLabel}</span><textarea name="message" required minLength={10} maxLength={3000} rows={2} /></label>
          <input className="honeypot" aria-hidden="true" type="text" name="website" tabIndex={-1} autoComplete="off" />
          <button type="submit" className="inquiry-submit" disabled={sending}>
            {sending ? copy.sendingLabel : copy.submitLabel}<span aria-hidden="true">•</span>
          </button>
          <p className="form-feedback" role="status">{feedback}</p>
        </form>
      </>}
      <button type="button" className="inquiry-close" ref={closeButton} onClick={close}>{copy.closeLabel}</button>
    </div>
  </dialog>;
}

function BoxItem({ item, className = '' }: { item: SectionItem; className?: string }) {
  return <article className={`box-item ${className}`}>
    <ImageView artwork={item} fallback="/art/notebook.svg" />
    <div className="box-item-copy"><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div>
  </article>;
}

export default function Experience({ data: d }: { data: Homepage }) {
  const page = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const { active, goToScene, setScrollLocked } = useScrollStory(page);
  const orderLabel = `${d.hero.ctaLabel} ${d.hero.priceLabel} • ${d.hero.price}`;

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 992px)');
    const closeAtDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener('change', closeAtDesktop);
    return () => desktop.removeEventListener('change', closeAtDesktop);
  }, []);

  function openInquiry() {
    setScrollLocked(true);
    setInquiryOpen(true);
  }

  function closeInquiry() {
    setScrollLocked(false);
    setInquiryOpen(false);
  }

  const orderText = <>{d.hero.ctaLabel} <span>{d.hero.priceLabel}</span><i aria-hidden="true">•</i>{d.hero.price}</>;

  return <div ref={page}>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="page-progress" aria-hidden="true"><i /></div>
    <main id="main" tabIndex={-1}>
      <div id="top">
        <section className="hero" aria-labelledby="hero-heading">
          <ImageView artwork={d.hero} className="hero-pen" fallback="/art/hero-pen.svg" eager />
          <header className={`site-header ${menuOpen ? 'menu-open' : ''}`}
            onKeyDown={event => {
              if (event.key === 'Escape' && menuOpen && !inquiryOpen) {
                event.preventDefault();
                setMenuOpen(false);
                requestAnimationFrame(() => menuButton.current?.focus({ preventScroll: true }));
              }
            }}>
            <a className="brand" href="#top" aria-label={`${d.brand} home`} onClick={() => setMenuOpen(false)}>{d.headerWordmark}</a>
            <button className="mobile-toggle" ref={menuButton} type="button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-controls="homepage-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={30} aria-hidden="true" /> : <Grip size={28} aria-hidden="true" />}
            </button>
            <div className="menu-panel" id="homepage-navigation">
              <nav aria-label="Main navigation">
                {d.navigation.map((link, i) => <a href={safeHref(link.href)} key={link.id ?? i} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
              </nav>
              <div className="menu-product">
                <ImageView artwork={d.menuArtwork} />
                <button type="button" className="order-button" onClick={openInquiry}>{orderText}</button>
              </div>
              <div className="menu-credits"><span>{d.footerCopyright}</span><span>{d.footerCredit}</span></div>
            </div>
            <div className="header-order">
              <ImageView artwork={d.brandMark} className="brand-mark" eager />
              <button type="button" className="order-button" aria-label={orderLabel} onClick={openInquiry}>{orderText}</button>
            </div>
            <button type="button" className="mobile-order" aria-label={orderLabel} onClick={openInquiry}>
              <ImageView artwork={d.brandMark} className="brand-mark" eager />
            </button>
          </header>
          <h1 id="hero-heading" className="hero-title">{d.hero.title}</h1>
          <Wipe />
        </section>
      </div>

      <section id="specifications" aria-labelledby="specs-heading">
        <div className="spec-scene">
          <SectionTitle id="specs-heading" heading={d.specsHeading} />
          <ImageView artwork={d.specsArtwork} className="spec-pen" fallback="/art/pen-transparent.svg" />
          <div className="spec-cards">
            {d.specifications.map((item, i) => <article className="spec-card" key={item.id ?? i}>
              <h3>{item.title}</h3>
              {item.description && <p>{item.description}</p>}
              <ul>{item.bullets?.map((bullet, j) => <li key={bullet.id ?? j}>{bullet.text}</li>)}</ul>
            </article>)}
          </div>
          <SceneControls index={active.specifications} titles={d.specifications.map(item => item.title)} label="specification"
            select={index => goToScene('specifications', index)} />
          <Wipe />
        </div>
      </section>

      <div className="thought-section">
        <section className="manifesto" aria-label="Our philosophy">
          <p className="manifesto-words">{d.manifesto.trim().split(/\s+/).map((word, i) => <span className="manifesto-word" key={i}>{word}{' '}</span>)}</p>
        </section>
        <section id="who-its-for" className="audience" aria-labelledby="audience-heading">
          <div>
            <h2 id="audience-heading">{d.audienceHeading.title}</h2>
            {d.audienceHeading.description && <p className="audience-description">{d.audienceHeading.description}</p>}
          </div>
          <div className="audience-copy">
            <p className="audience-lead">{d.audienceIntro}</p>
            {d.audiences.map((item, i) => <article key={item.id ?? i}>
              <h3>{item.title}</h3><p>{item.description}</p>
            </article>)}
          </div>
        </section>
        <section id="about" className="about-visual" aria-label={d.aboutArtwork.alt}>
          <div className="about-panel"><ImageView artwork={d.aboutArtwork} fallback="/art/pen-transparent.svg" /></div>
        </section>
      </div>

      <section id="smartpaper" aria-labelledby="paper-heading">
        <SectionTitle id="paper-heading" heading={d.paperHeading} />
        <div className="paper-story">
          {d.paperDetails.map((item, i) => <article className="chapter-slide paper-slide" key={item.id ?? i}>
            <ImageView artwork={item} fallback="/art/notebook.svg" />
            <h3 className="chapter-copy paper-title">{item.title}</h3>
            <div className="chapter-copy paper-caption"><h4>{item.caption}</h4><p>{item.description}</p></div>
          </article>)}
          <SceneControls index={active.paper} titles={d.paperDetails.map(item => item.caption)} label="Smartpaper chapter"
            select={index => goToScene('paper', index)} />
          <Wipe />
          <div className="paper-wipe" aria-hidden="true" />
        </div>
      </section>

      <section id="inside-the-box" aria-labelledby="box-heading">
        <SectionTitle id="box-heading" heading={d.boxHeading} />
        <div className="box-contents">
          <BoxItem item={d.boxSet} className="box-set" />
          <p className="box-overview">{d.boxProductOverview}</p>
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
          {d.colors.map((color, i) => <article key={color.id ?? i}
            className={`chapter-slide finish-slide ${color.darkText ? 'dark-text' : ''}`}
            style={{ '--scene-tone': /^#[0-9a-f]{6}$/i.test(color.tone) ? color.tone : '#303139' } as CSSProperties}>
            <ImageView artwork={color} fallback="/art/pen-transparent.svg" />
            <div className="chapter-copy finish-caption">
              <h3>{color.title}</h3><p>{color.description}</p>
            </div>
          </article>)}
          <SceneControls index={active.finishes} titles={d.colors.map(item => item.title)} label="pen finish"
            select={index => goToScene('finishes', index)} />
        </div>
      </section>
    </main>

    <footer className="footer">
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
    {inquiryOpen && <InquiryModal copy={d.formCopy} close={closeInquiry} />}
  </div>;
}
