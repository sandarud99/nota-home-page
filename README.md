# NŌTA homepage — complete-section frontend rebuild (v3)

Independently authored, responsive Next.js recreation for the Surge Global Senior Web Developer take-home. **Frontend phase only**, with a content adapter for a later Strapi integration. Source/reference: https://nota.uprock.pro/. The assignment allows referencing its images, but forbids copying its HTML, CSS, or JavaScript. No reference source code was used.

> **Important:** This frontend is a working frontend implementation, not a pixel-perfect verified match. Before submitting, manually compare at 1440px, 1024px, 768px, 390px and 320px, inspect the reference animations and order form, and make the needed adjustments. I could inspect the reference's published content and media but couldn't run the original site side-by-side here. Review and understand all code before submitting.

## Run locally

Requires Node.js 20.9+ (Node 22 LTS recommended), npm, Git.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. **You do not need Strapi to view this frontend.** The homepage content is provided from `src/content/homepage.ts` in this phase, so you can develop and inspect the design. Ensure `.env.local` includes `CONTENT_SOURCE=local`.

### Images

The assignment permits reuse of the reference site's image assets. To keep the initial ZIP light, `src/content/homepage.ts` starts with direct media URLs to the reference. Those assets will load while you have internet and the original website remains online; there are SVG fallbacks under `public/art/` in case it is unavailable.

**Recommended:** run `npm run assets:download` while you have internet. It downloads referenced **image files only** into `public/images/` and switches the content file to local paths, making the homepage less dependent on the reference site's availability. Check the resulting downloaded files before publishing. It does **not** clone or download any reference HTML/CSS/JS. Commit the downloaded images if allowed by the assignment and licensing terms.

## Included interactions

- Desktop nav scrolls to sections; responsive expandable mobile navigation.
- GSAP ScrollTrigger pinned hero with fully scrollbar-scrubbed product zoom and text transition; pinned word-by-word manifesto; pinned full-viewport pen specifications, features, smart-paper gallery, and five color scenes that track scroll position in both directions; global scroll progress rail; Lenis smooth scrolling; respects reduced-motion preference.
- ScrollTrigger-driven feature and finish slide decks. Arrow buttons and color swatches move to exact scroll positions rather than advancing disconnected carousels.
- Order button opens an accessible modal; Escape and backdrop click close it. Input validation is present.
- Form **does not save in the frontend-only phase**. It returns a clear error instead of falsely claiming success. Connect Strapi before accepting submissions. This is mandatory for the final Surge Global assignment.
- `noindex,nofollow` SEO metadata and robots settings.

## Architecture

```
src/
  app/
    page.tsx                 # page composition; local / Strapi switch
    layout.tsx               # SEO metadata, noindex
    globals.css              # original responsive design system
    api/inquiry/route.ts     # validated server-side form proxy; requires Strapi
  components/Experience.tsx  # homepage sections and interactions
  content/homepage.ts        # structured local-first content
  lib/strapi.ts              # typed CMS contract, safe URLs, API fetching
public/art/                 # local illustrative SVG fallbacks
scripts/download-assets.mjs  # optional image-only download
```

All displayed content lives in `src/content/homepage.ts`, not hardcoded within the React section components. This is **temporary local content** to speed up frontend development; it is **not equivalent to passing the CMS requirement**.

## Strapi — integrate when the frontend is ready

Use the companion Strapi starter schemas from the separate initial full-stack starter, or create them yourself. Create a single-type `Homepage` with structured repeatable components matching `src/lib/strapi.ts`: navigation links, hero, specification items/bullets, manifesto, audience items, feature slides, paper details, box items, color variants, footer, SEO and form labels. Create an `Inquiry` collection type for the form. Use persistent media storage (Cloudinary or S3) when deployed on Railway.

1. Populate and publish Homepage in Strapi, including media and SEO.
2. Implement/read the Strapi API endpoint `/api/public-homepage` returning `{data: Homepage}` (or edit `getHomepage()` to use Strapi's native populated REST response). Public endpoint should send only published content. Keep media URL normalization in `src/lib/strapi.ts`.
3. Implement `/api/public-inquiries` on the Strapi server with validation and spam/rate protection; the existing Next API route forwards to it server-side.
4. In `.env.local`, set `CONTENT_SOURCE=strapi`, `NEXT_PUBLIC_PREVIEW_MODE=false` and `STRAPI_URL=http://localhost:1337` and `NEXT_PUBLIC_STRAPI_URL=http://localhost:1337` (the public Strapi origin for uploaded media URLs). The frontend now requires the CMS and won't silently fall back to local content.
5. Test publishing a text/image edit in Strapi, reload frontend and verify it changes without redeploying. `cache: 'no-store'` is already set.
6. On Railway, use 3 services: Next.js, Strapi, and PostgreSQL; host uploads on persistent object storage. Invite review-team administrators rather than sharing one password.

## Final review checklist

- [ ] Compare with original site across breakpoints using side-by-side screenshots.
- [ ] Test every original transition; revise timing/easings to match.
- [ ] Save original permitted images locally or in Strapi media storage and verify none fail.
- [ ] Connect all content, links, prices, navigation and SEO to Strapi (no frontend fallback in production).
- [ ] Verify live CMS edits after publishing, without code deployment.
- [ ] Test real form validation and saving into the Strapi `Inquiry` collection.
- [ ] Deploy Next.js + Strapi + PostgreSQL on Railway, secure secrets and public admin login.
- [ ] Verify images survive redeploy.
- [ ] Add each required reviewer with their own Strapi admin invite.
- [ ] Record under-10-minute Railway infrastructure walkthrough.
- [ ] Submit final URL, admin URL/access, GitHub URL, recording, and honest README.

## Framework and trade-offs

Next.js App Router + TypeScript provide server data loading and a good separation between CMS transport and view logic. GSAP/ScrollTrigger, Lenis and CSS deliver expressive motion without importing the reference's code. Components consume a typed `Homepage` document. The first pass uses one `Experience.tsx` for easy visual iteration; a production refactor should split sections into smaller modules and add visual-regression tests. The scroll-progress deck is original TypeScript/CSS rather than an imported slider. The frontend-only stage uses editable source data and optional remote media, intentionally leaving CMS/live data/storage/form submission for the next stage.

## AI tools

OpenAI ChatGPT assisted with reference-content research, architecture, independently authored React/TypeScript/CSS, review checklist and README. The developer must review and be able to explain all submitted code. List any other AI tooling you use.

Original design/artwork belongs to its creators. This demo is non-indexed and should be removed after the interview round closes.

## Scroll behavior (the fix to the earlier version)

`src/components/Experience.tsx` now creates genuine ScrollTrigger pins, not one-shot scroll reveals. The hero is pinned for ~190vh of scrolling while the image zoom, title exit and second hero caption are bound directly to progress (`scrub`). The manifesto pins and reveals each word as you scroll. Features and pen finishes are pinned decks whose visibility and transforms are calculated **continuously** from `ScrollTrigger.progress`, including reverse scrolling. Control buttons move the actual document scroll position to the appropriate chapter. A fixed reading-progress rail remains attached to the viewport.

Test by slowly scrolling with the mouse wheel or touchpad: the hero should remain in place as the pen zooms. Scroll backwards: all positions rewind. Later, the feature and pen-color content must stay pinned while scenes change. This is the important interaction fidelity improvement, but the timings and all original behaviors should still be compared in a real browser with the reference.

**Codex:** This environment does not expose a Codex agent, so the changes were implemented directly with independently authored TypeScript/CSS. Do not list Codex as a tool used unless you actually run it.

## Local validation performed for this revision

- TypeScript/TSX syntax parsed successfully for 7 source files with the TypeScript compiler API (no parse diagnostics).
- CSS parsed with `tinycss2` (no stylesheet syntax diagnostics).
- A separate self-contained static preview of the same scroll-story architecture was tested in Chromium at 1440×900 and 390×844: hero sticky at mid-scroll, feature scene advanced from 01 to 02 and reversed to 01, color scene switched to 03, no JS page errors or horizontal overflow.
- **Limitation:** The actual Next.js app was **not** compiled or browser-tested here because dependencies couldn't be installed in this execution environment. The standalone preview uses native sticky positioning and a small independent progress handler; the Next.js code uses GSAP ScrollTrigger and Lenis. Treat these as related but not identical implementations, and run the Next.js app on your machine before submitting.
- Browser previews use permitted source image URLs from the reference; when remote assets are unavailable, the separate SVG fallbacks are shown. Download the permitted images locally for a more reliable final build.


## V3 — Complete homepage refinement (2026-11-17)

All major **reference homepage** sections are implemented in this phase:

1. Pinned smart-pen hero with close-up product motion and scrubbed typography transition.
2. Editorial NŌTA Specifications introduction, plus pinned 3-state nib and technical specifications scene.
3. Pinned word-by-word writing manifesto.
4. “Who it’s for” and three detailed audience personas.
5. 3-state full-width digital continuity / synced notes / AI / paper storytelling chapters.
6. Smartpaper introduction and 4-state scroll-driven visual gallery with the permitted original paper-product image URLs.
7. “Inside the box” product image, pen-feature annotations and complete item descriptions.
8. 5-stage pen finish story (silver introduction, graphite, mist blue, precision red, bright orange).
9. Navigation, full footer, responsive mobile menu, inquiry modal, SEO noindex.

The authoring data is in `src/content/homepage.ts`; all newly-added sections use the typed `Homepage` contract. For Strapi, use structured components for the extra `boxCallouts` and `boxProductOverview` fields. **Frontend-only does not fulfill the final CMS requirement.**

### Browser preview

A separate `preview/index.html` is included. It is an interactive self-contained **demonstration** of the frontend layout using browser sticky positioning and original custom scroll-progress logic. Its fallback SVG product art is embedded in the file, so it can open without npm. Online, the permitted original media URLs should load in their place.

The actual Next.js application uses GSAP ScrollTrigger pinning and Lenis; it is not identical to the preview’s fallback implementation. Do not submit the preview HTML as your Next.js source.

### Validation performed in this environment

- Parsed three revised TypeScript/TSX modules with the TypeScript compiler API without syntax errors.
- Parsed complete CSS with PostCSS without syntax errors.
- Chromium tested the standalone preview at **320×640, 390×844, 768×1024, 1024×768, and 1440×900**: no horizontal overflow, no uncaught page errors.
- Verified scene counters progress from the initial slide to a later slide while scrolling for specifications, digital features, smartpaper, and colors; tests covered desktop and mobile.
- Opened/closed modal and verified required fields prevent blank submissions.
- **Not yet validated:** actual Next.js npm install/build, runtime GSAP/Lenis integration and side-by-side matching of the live reference animations. This environment has restricted npm downloads and cannot execute the reference site's own interactive browser session.

### Design fidelity and limits

This is an independently written close visual reconstruction, **not a guaranteed exact or pixel-perfect reproduction**. Reference copy, section order and available image URLs were inspected; original source HTML/CSS/JS were not copied. Inspect the original site in your browser at matching viewport sizes before turning in the assignment, especially the precise pinned timing and mobile image placements. The original reference imagery is remote by default; run `npm run assets:download` from an internet-connected development machine to secure it locally.
