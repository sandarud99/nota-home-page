# AGENTS.md — NŌTA Homepage / Surge Global Senior Web Developer Assignment

> **Read this entire document before editing the repository.** This is the operating brief for the AI coding agent in Google Antigravity (or any IDE agent). The user wants you to **implement and test**, not merely explain or propose code. Keep the user informed of material blockers and ask for credentials/permission only when an external account action truly requires it.
>
> **Priority:** First make the existing Next.js homepage match the reference as closely as feasible, with scroll interactions that remain synchronized to the browser scrollbar. Then complete Strapi 5, persistent content/media, and Railway deployment. Do not throw away the newest frontend and start from scratch.

## 0. Quick-start message for the agent

When the user opens this project in Antigravity and starts an agent chat, they can paste:

> Read `AGENTS.md`, `README.md`, `src/components/Experience.tsx`, `src/content/homepage.ts`, and `src/lib/strapi.ts` first. This is my Surge Global Senior Web Developer take-home. Work directly in the existing files. First install dependencies, run and test the frontend, and bring **every homepage section and scroll-controlled interaction** as close as possible to https://nota.uprock.pro/ without copying its HTML/CSS/JS. Then implement Strapi 5 content models, forms, and Railway readiness as described in AGENTS.md. Do not stop at a plan or a mockup. Show what changed, screenshots/verification, exact commands, and any gaps you could not verify. Ask me only when you actually need credentials, account approvals, or a major decision.

---

## 1. Assignment source of truth

- **Employer:** Surge Global.
- **Role:** Senior Web Developer.
- **Task:** Rebuild **only the homepage** of **https://nota.uprock.pro/** with a frontend framework of choice, **self-hosted Strapi**, deployed to **Railway**.
- **Submission deadline:** **Saturday, November 21, 2026, 9:00 AM Sri Lanka Standard Time (Asia/Colombo, UTC+05:30)**. Aim for a final deployed build at least one day earlier.
- **Submission form:** https://forms.gle/eevrjozsy7PXE4m97
- **Review contact:** kavinda.kobbekaduwe@surge.global
- **Required Strapi admin reviewer access:** kavinda.kobbekaduwe@surge.global, kavisha@surge.global, samith@surge.global.
- **Deliverables:** (1) live frontend URL, (2) Strapi admin URL and reviewer access, (3) screen recording **under 10 minutes** walking through each Railway infrastructure component, (4) GitHub repo public or shared with the reviewers, (5) README covering framework rationale, local setup, content model, trade-offs, improvements with more time, and exact AI tools used.
- **Important:** Reviewers assess the last commit/deployment before the deadline.
- **Legal/ethical constraints:** Code must be independently authored; **reference image assets may be reused**, but **do not copy the original website HTML, CSS, or JavaScript**, use a site-cloner/exporter, or present its original source as your own. Add `noindex`; keep the site live through the review round and take it down afterward. The developer must be able to explain every submitted line.

### Assessment criteria (in priority order)

1. Visual + interaction fidelity, desktop and mobile.
2. Quality of Strapi content modeling and editing experience.
3. Code quality, composability, types, security, accessibility.
4. Railway infrastructure, services, persistent storage, environment variables, networking.

## 2. Repository to continue — don't use the obsolete starter

The latest artifact from the previous iteration is named **`nota-homepage-full-rebuild.zip`**, containing the root directory **`nota-homepage-full-rebuild/`**. This is the **V3 frontend**. If the user has a different extracted directory name, inspect it instead of assuming paths.

Other earlier artifacts (`nota-homepage-nextjs.zip`, `nota-homepage-scroll-rebuild.zip`, `nota-assignment-starter.zip`) are **older**. The early full-stack starter has some initial Strapi schemas, but they may not match V3's expanded homepage model. Reuse ideas selectively; **never replace the latest frontend with the old one**.

### Verified files in the V3 ZIP

```text
nota-homepage-full-rebuild/
├── src/
│   ├── app/
│   │   ├── page.tsx                # local data vs Strapi data switch
│   │   ├── layout.tsx              # page metadata + noindex
│   │   ├── robots.ts               # robots policy
│   │   ├── globals.css             # page styling and responsive breakpoints
│   │   └── api/inquiry/route.ts    # JSON validation and forwarder to Strapi
│   ├── components/
│   │   └── Experience.tsx          # all sections, GSAP ScrollTrigger, Lenis, modal
│   ├── content/
│   │   └── homepage.ts             # structured LOCAL content + reference image URLs
│   └── lib/
│       └── strapi.ts               # Homepage TypeScript contract + Strapi fetch adapter
├── public/art/                   # illustrative SVG fallback assets
├── scripts/download-assets.mjs   # optional download of permitted image assets only
├── preview/index.html            # STANDALONE illustrative preview, not production frontend
├── .env.example
├── package.json
└── README.md
```

**Do not mistake `preview/index.html` for the real application.** It uses different native sticky/scroll logic for an easily opened demonstration; the actual Next.js app uses GSAP and Lenis. Prior demonstrations of the static preview do **not** prove the Next.js runtime works.

### Actual package dependencies, as inspected

- Next.js `^15.5.0`, React `^19.1.0`, TypeScript, Tailwind 4 tooling, custom CSS.
- GSAP `^3.14.2` + ScrollTrigger.
- Lenis `^1.3.8`.
- lucide-react.
- **Swiper is not installed in V3** even though earlier conversation described sliders. Scroll-linked slide decks currently use original GSAP/CSS code. Do not claim Swiper is used unless you actually add it.

### Current environment variables

```dotenv
# Frontend-only local mode
CONTENT_SOURCE=local
NEXT_PUBLIC_PREVIEW_MODE=true

# When CMS is running locally:
STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
```

`src/app/page.tsx` uses local `homepageData` unless `CONTENT_SOURCE=strapi`. In Strapi mode it fetches `${STRAPI_URL}/api/public-homepage`, expects `{ "data": Homepage }`, and has **no silent local fallback**. The current `src/app/api/inquiry/route.ts` forwards POST requests to `${STRAPI_URL}/api/public-inquiries` **only in Strapi mode**; while local, it returns a 503 response deliberately and does not save data. The Strapi APIs are **not implemented in the V3 ZIP**.

### Existing local setup

From the extracted **V3 project root**:

```bash
node --version
npm --version
npm install
# macOS/Linux: cp .env.example .env.local
# Windows PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open **http://localhost:3000**. Current scripts: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run assets:download`.

Start with compatible Node LTS (verify Next.js and Strapi requirements for versions actually installed). Inspect errors before changing versions. Do not delete useful files to make lint/build pass. If image downloads fail, preserve fallback behavior and report the missing assets.

---

## 3. Immediate mission: make the WHOLE homepage visually accurate

Reference: **https://nota.uprock.pro/**. Inspect it manually in a browser at matching viewports. The user specifically rejected earlier versions because they were too generic and animations were **not attached to scrolling**. They liked the subsequent GSAP scroll-driven improvement and now want **every section** brought much closer to the original.

### Pages / sections to inspect and reproduce

The most recent V3 build implements the following broad sequence; compare against the LIVE reference and fix discrepancies instead of assuming this list is exhaustive:

1. Fixed/overlay header, wordmark, section navigation, order button, responsive mobile menu.
2. Full-viewport smart-pen hero, close-up product imagery, oversized typography, scroll-linked product movement and scene transition.
3. Editorial specification intro, plus a scroll-pinned 3-stage pen specifications sequence (writing system, capture technology, digital continuity).
4. Full-viewport manifesto with progressive word-by-word reveal.
5. “Who it's for” content and three audiences: Students & Learners; Creators, Designers & Architects; Managers & Product Thinkers.
6. Scroll-linked features describing synchronized phone notes, AI-powered structure, and writing on paper.
7. Smartpaper explanatory section and four scroll-controlled media/description stages.
8. “Inside the box” product close-up, annotations/callouts, and set contents.
9. Product-color chapters: introductory silver, Graphite Black, Mist Blue, Precision Red, Bright Orange (check exact labels/states against the reference).
10. Full footer and ordering/inquiry interaction.

**Highest-fidelity targets:** actual image composition/cropping, desktop typography scale/weight/tracking, whitespace, color palette, section heights, overlaid labels, pointer/touch behavior, movement timing, pinned duration, state sequence, transitions on reverse scroll, links, hover interactions, and responsive layouts.

### Critical scrolling behavior — acceptance criteria

- Use **GSAP ScrollTrigger** to pin appropriate scenes; keep the visual stage attached to the scrollbar for the correct length of scroll.
- Animate using `scrub` / continuous `onUpdate(progress)` so wheel/touchpad scrolling **forward and backward** advances/reverses motion precisely.
- In the hero, the pen and typography should evolve while the hero remains pinned; do not replace it with an ordinary one-time fade-in.
- For specifications, features, paper and colors, a multi-state scene should stay pinned while the scene transitions continuously according to scroll position.
- Arrows and color selectors, if present, must update the actual scroll position (and active state), not create a visual state divorced from scroll.
- The progress rail should accurately reflect total scroll position.
- Refresh ScrollTrigger after images/fonts change dimensions; clean up triggers/GSAP contexts, Lenis listeners and ticker callbacks on unmount.
- Verify normal scrolling resumes before/after each pinned section: no perpetual pin, scroll locking, overlap, blank giant gap, or content jumping.
- Honor `prefers-reduced-motion` with a functional accessible non-animated presentation.
- Test wheel, touchpad and mobile touch, and reverse scrolling in the deployed app.

### Image/media handling

- `src/content/homepage.ts` contains permitted reference **image URLs** (`photo.pen`, `.mobilePen`, `.nib`, `.phone`, `.notebook`, `.paperCover`, `.paperSpread`, `.paperWriting`, `.paperPhone`, `.silver`, `.graphite`, `.blue`, `.red`, `.orange`, etc.). Reuse **images only**, as permitted by the assignment.
- `npm run assets:download` attempts to save them into local `public/images/` and rewrite references. **Review every result and ensure the images resolve**; the reference may change or block downloads.
- Never copy the original page's HTML, stylesheets, JS bundles, site-building exports, or automatically cloned layout structure.
- Match actual image placement/crop/object-fit and mobile-specific sources; an SVG illustration fallback does not count as a reference-quality image.
- When migrating to Strapi, upload selected images to its media library and reference media fields, not hardcoded remote URLs.

### Layout / UX quality bar

Test at minimum: **320×640, 390×844, 768×1024, 1024×768, 1440×900**, plus a wider desktop if possible. Ensure no horizontal overflow, illegible text, clipped product imagery, overlapping fixed elements, sticky collisions, inaccessible nav or hidden CTAs. Verify interactive form and focus behavior on mobile.

Perform **side-by-side** screenshots of original vs local page at the same viewport and same scene positions. Fix the biggest mismatch first (image composition, geometry, font, background, section length, then micro-details). Do this across ALL sections; do not spend the entire task polishing only the hero.

---

## 4. Implement in small, verifiable steps

**Phase A — make the real Next.js app build and run**

1. Inspect existing files and install dependencies.
2. Run `npm run typecheck`, `npm run lint`, `npm run build` and fix genuine issues.
3. Launch the real Next.js app at localhost:3000; open in Chromium via Playwright/devtools if available.
4. Verify all image requests, console errors, scrolling / resizing, accessibility basics.
5. Keep an evidence trail: screenshots by section + viewport, summary of issues fixed, commands executed and their results.

**Phase B — visual/animation parity**

1. Record the reference's section order, each scene's visual structure and scroll-state behavior.
2. Audit the existing `Experience.tsx` scene architecture and CSS.
3. Fix styles, images, layout, animation and responsive issues per scene.
4. Refactor the single large `Experience.tsx` into clear modules *only if doing so improves safe iteration and doesn't break the animation graph*.
5. Retest reverse scrolling, mobile nav, reduced-motion, and layout shifts after each round.

**Phase C — Strapi CMS integration**

1. Create a **self-hosted Strapi 5 project** under `cms/` (or in a sibling monorepo package) using compatible Node version.
2. During local development use SQLite if convenient; for Railway deploy on **PostgreSQL**, with a planned content migration/seed.
3. Make editor-friendly schema: **Homepage single type** containing reusable components and repeatable items — not one long rich-text field.
4. Model **all** copy, images, links, navigation, labels, prices, product variants, footer, and SEO metadata as editable CMS values.
5. Implement a public **published-homepage read endpoint** compatible with `getHomepage()` OR adapt the transport to Strapi-native REST with explicit nested `populate`. Strapi 5 REST responses differ from v4; inspect the real JSON.
6. Create `Inquiry` collection type and a controlled POST route with server-side validation, honeypot/rate limiting and no unnecessary public write permissions. Confirm form submissions show in the admin interface.
7. Make real Strapi content and media entries. Publish a change and verify the frontend updates without redeploy (`cache: 'no-store'` or correct cache invalidation).
8. Turn on `CONTENT_SOURCE=strapi` in the frontend for final testing and production. Local data should **not** supply production content or hide missing CMS fields.
9. Ensure no copy, links, pricing, navigation, section media, SEO values or order-form copy are still hardcoded in React. Existing hardcoded decorative strings and stage captions in `Experience.tsx` need an audit.

**Phase D — Railway deployment**

1. Push original work to a GitHub repo the user controls.
2. Connect Railway to GitHub **only after the user signs in/approves**.
3. Provision **PostgreSQL**, **Strapi API/admin**, and **Next.js frontend** as separate services. Configure correct source directories/build/start commands/health checks.
4. Backend talks to Postgres on Railway private network. Frontend server talks to Strapi via a reachable URL (private networking is fine for server-side fetch; media URLs must be browser-reachable).
5. Configure Strapi production secrets/server URL, database URL, frontend Strapi URL, public media URL, CORS as needed, and upload persistence.
6. Use persistent storage for uploads: correctly configured **Railway Volume** mounted at the actual Strapi upload path, or a configured S3-compatible/Cloudinary provider. A Railway ephemeral filesystem is **not acceptable**.
7. Test publishing edits without rebuilding frontend, form persistence, and **media survival after redeploy/restart**.
8. Check production metadata `noindex,nofollow`, `robots.txt`, HTTPS, broken links, console/network errors, and responsive behavior on the deployed site.

**Phase E — submission deliverables**

1. Invite the three named reviewer emails to Strapi as admin users with the required access. Do not paste passwords or API keys into repository or chat. If email invitations are unavailable, coordinate a secure access handoff approved by the user.
2. Share repository access to the same reviewers or make it public, per user's preference.
3. Produce a **truthful** README: exact setup commands, architecture decisions, structured CMS models, deployment architecture, trade-offs, future improvements, AI tools actually used and tasks performed by each.
4. Record a <10-minute screen capture showing Railway frontend + CMS + PostgreSQL service, service boundaries, environment variables **without revealing secrets**, networking, upload storage and content publish flow.
5. Provide the final live frontend URL, Strapi admin URL/access instructions, GitHub URL, recording, README and submission form link. User submits before **Nov 21 2026, 9:00 AM Asia/Colombo**.

---

## 5. Strapi data model — use existing frontend contract as starting point

`src/lib/strapi.ts` already defines `Homepage`, `Media`, `NavLink`, `Heading`, `SectionItem`, `Feature`, and `FormCopy`. Preserve the frontend contract or refactor with a tested adapter. Proposed editor-friendly Strapi 5 schema:

### Single type: `Homepage`

| Field | Suggested Strapi type | Notes |
|---|---|---|
| `brand`, `headerWordmark` | Text | Header identity |
| `navigation` | Repeatable `shared.link` | label + href |
| `hero` | `sections.hero` component | eyebrow, title, subtitle, price label/value, CTA label, desktop/mobile media |
| `heroScrollLabel` | Text | scroll UI text |
| `specsHeading` | `shared.heading` | eyebrow, title, description |
| `specifications` | Repeatable `sections.item` | title, description, media, repeatable bullets |
| `manifesto` | Long text | writing statement; reveal each word via frontend |
| `audienceHeading`, `audienceIntro` | heading + long text | intros |
| `audiences` | Repeatable item | audience cards |
| `featuresHeading` | heading | feature section intro |
| `features` | Repeatable `sections.slide` | eyebrow, title, description, media |
| `paperHeading`, `paperTitle`, `paperDescription` | heading + text | smart paper intro |
| `paperImage`, `paperDetails` | Media + repeatable item | four media sequence |
| `boxHeading`, `boxTitle`, `boxDescription` | heading + text | inside the box |
| `boxProductOverview`, `boxCallouts` | text + repeatable small text component | **V3-specific extra fields** |
| `boxItems` | Repeatable item | product set content |
| `colorsHeading`, `colors` | heading + repeatable item | five color states; consider a specific finish component for `tone` |
| `footerDescription`, `footerLinks`, `footerCopyright`, `footerCredit` | text + links | editable footer |
| `formCopy` | `shared.form-copy` component | all labels, message, CTA, success copy |
| `seo` | `shared.seo` component | meta title, description, OG image; force `noindex` regardless |

Use Strapi components/repeatable items, component validation and appropriate field descriptions. For `tone`, use a safe validated hex color in the component. For navigation anchors use an allowlisted `#section-id` or safe external `https:` URL.

### Collection type: `Inquiry`

- `name`: required short text (2–120 chars)
- `email`: required email
- `message`: required long text (10–3000 chars)
- optional creation timestamp automatically managed by Strapi
- submissions visible to administrators, **never exposed through an unauthenticated GET**
- public POST endpoint performs validation server-side; reject honeypot, enforce basic abuse protections and rate limiting; set sensible request size limits

### API integration contract

The existing `getHomepage()` expects:

```http
GET /api/public-homepage
Accept: application/json
```

```json
{ "data": { "brand": "NŌTA", "navigation": [], "hero": {"title": "..."}, "specifications": [], "audiences": [], "features": [], "paperDetails": [], "boxItems": [], "colors": [], "footerLinks": [] } }
```

**This is the expected frontend adapter payload**, not a claim that Strapi exposes this route automatically. Implement an explicit safe read controller/service that loads only **published** homepage content, populates nested media/components, and maps to the `Homepage` shape. Or modify the frontend adapter with tests. Strapi 5's normal REST endpoints need explicit nested `populate` and return flattened data rather than v4's `data.attributes` shape. Do not depend on an unsupported `populate=deep` shortcut.

```http
POST /api/public-inquiries
Content-Type: application/json

{ "name": "...", "email": "...", "message": "...", "website": "" }
```

Return success **only after successful database persistence**. If backend is unavailable, show a clear error in the frontend. Do not fake success. Never expose an admin token in `NEXT_PUBLIC_*` environment variables or in the browser bundle.

---

## 6. Specific code concerns to audit

- The hero and other sections currently include some **hardcoded UI strings** in `Experience.tsx` (e.g. `N° 01 — NŌTA`, `THINK BY HAND`, scene captions, default stage labels, arrows/counters). The final CMS requirement says **all homepage content** must be editable, so model those if they are content rather than decorative/accessibility-only symbols.
- `src/content/homepage.ts` contains all local copy and remote reference URLs. It is only a **temporary content fixture**, not a CMS replacement. After Strapi cutover ensure production build does not use this fixture to fill missing content.
- The inquiry form's existing route validates basic input and proxies to Strapi, but does not currently reject non-empty honeypot itself; enforce validation/abuse controls server side.
- Test actual modal focus trap and keyboard flow (initial focus, escape, return focus, tab containment); some interactions may need improvement.
- Use media fields in CMS. The existing `mediaUrl()` supports local, Strapi and absolute URLs, but inspect URL normalization and avoid mixed-content or relative/private network image URLs in production.
- Existing `package.json` does not include Playwright or tests. Add smoke or e2e tests and run against the **actual Next.js app**, not only the static preview.
- The frontend uses `next@^15.5.0`, which is the actual V3 dependency at creation. Don't claim it is newer without checking; avoid casual major upgrades right before the deadline.
- The existing ZIP does not contain the final Strapi server or Railway project; do not claim those are done.

## 7. Verification matrix / definition of done

### Functional

- [ ] `npm install` succeeds in the actual frontend root.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` succeed.
- [ ] All original homepage sections represented in correct order.
- [ ] Pinning/scrubbing works and reverses in actual Next.js browser sessions.
- [ ] No sideways scroll or overlapping elements at listed breakpoints.
- [ ] Images load consistently in mobile and desktop.
- [ ] Header links, menus, buttons, sliders and modal behave correctly.
- [ ] Keyboard accessibility and `prefers-reduced-motion` work.
- [ ] Real valid form submission creates a Strapi `Inquiry`; invalid data fails visibly.

### CMS

- [ ] All public copy, image, link, product price, navigation, and SEO meta editable via Strapi.
- [ ] Content model uses structured components and repeatable items.
- [ ] Publishing an editor change affects the public homepage without redeploy.
- [ ] API shows published content only.
- [ ] Assets survive service redeployment.

### Deployment

- [ ] Railway project contains Next.js, Strapi and PostgreSQL services.
- [ ] Correct environment vars, secure secret handling and network topology.
- [ ] Live frontend HTTPS URL works; Strapi admin accessible securely.
- [ ] `noindex`/robots directives confirmed in deployed HTML/headers.
- [ ] Admin accounts invited/verified individually.
- [ ] Repo access, under-10-minute screen recording, README and submission links ready.

## 8. What was done before this handoff (do not overclaim)

1. A V3 frontend ZIP and separate interactive HTML preview were created.
2. V3 includes hero, specifications, manifesto, audience, feature, smartpaper, box, color and footer scenes.
3. The **standalone HTML preview**, **not the real Next.js runtime**, was tested in a browser at 320, 390, 768, 1024 and 1440px; basic scroll-state counters, form validation and layout overflow were checked.
4. Some TSX/CSS parsing checks were performed, but **the real Next.js npm build/browser integration was not verified** in the earlier environment.
5. **Strapi integration is incomplete; Railway deployment has not been performed.** The frontend-only form intentionally does not save entries.
6. ChatGPT helped draft and refine this project; Codex was **not actually invoked** in the previous environment. Only report AI tools that were actually used during this implementation.
7. Because the original animations were not comprehensively captured in a side-by-side interactive session, **pixel-perfect accuracy is unverified**. The user's main request is to close that gap.

## 9. Instructions for collaboration and reporting

- Work in the extracted source project, commit changes in meaningful groups, and avoid destructive rewrites.
- After each working tranche, give the user a concise report: **files changed**, **what visually/functionally improved**, **tests actually run**, **remaining mismatches**, and **next highest-priority step**.
- Do not claim 'exactly identical', 'deployed', 'tested', or 'CMS connected' unless independently verified.
- Use available browser/devtools/screenshots to compare the live reference, with no HTML/CSS/JS copying or site-export tooling.
- If the user asks only to finalize the local frontend first, complete **Phases A and B before starting C/D**; keep the CMS path ready and warn clearly that frontend-only fails the complete assignment.
- If a tool cannot view the reference or install packages, say exactly what is blocked, continue on unblocked improvements, and give the user one actionable next step.
- Do not expose secret environment values in logs, commits, screenshots, or the Railway walkthrough.
- Do not purchase services, push to the user's remote account, create reviewer accounts, or share a repository without the user's explicit authorization and access.

## 10. Useful official docs

- Next.js: https://nextjs.org/docs
- GSAP ScrollTrigger: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Lenis: https://github.com/darkroomengineering/lenis
- Strapi 5 REST API and explicit populate: https://docs.strapi.io/cms/api/rest and https://docs.strapi.io/cms/api/rest/populate-select
- Railway Strapi + Postgres + persistent uploads guide: https://railway.com/guides/strapi
- Railway: https://docs.railway.com/
- Google Antigravity project rules / `AGENTS.md`: https://www.antigravity.google/docs/rules-workflows?tab=ide

**First action for the agent:** inspect the current repository and dependency versions, run the real frontend, capture the homepage across several scroll states, and produce a prioritized visual parity issue list while immediately fixing the worst verified mismatch. Deliver working code, not only design recommendations.
