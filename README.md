# NŌTA homepage

Surge Global Senior Web Developer assignment. This continues the V3 Next.js project and rebuilds the public NŌTA homepage using independently written React, CSS and GSAP choreography. The assignment permits the reference product imagery, which is bundled for local preview and uploaded to Strapi for CMS mode. [NŌTA reference](https://nota.uprock.pro/)

## Local setup

Use Node 22 LTS (22.18 or newer), npm and PostgreSQL. The Docker command below starts a loopback-only database for development. An existing PostgreSQL database works with its connection URL passed to `npm run env:local`.

```sh
nvm use
npm ci
npm --prefix cms ci
docker run -d --name nota-postgres \
  -e POSTGRES_USER=nota -e POSTGRES_DB=nota -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 127.0.0.1:5432:5432 -v nota-pgdata:/var/lib/postgresql/data postgres:16
npm run env:local
npm --prefix cms run dev
```

In a second terminal, run `npm run dev`. Open [the homepage](http://127.0.0.1:3000/) and [the Strapi admin](http://127.0.0.1:1337/admin). Create your own first administrator on the welcome screen. `npm run env:local` generates matching proxy credentials and Strapi secrets in ignored local files and preserves existing settings. It reads [the frontend template](.env.example) and [the CMS template](cms/.env.example).

If port 5432 is already in use, publish the Docker database on 5433 by using `-p 127.0.0.1:5433:5432`, then run `DATABASE_URL=postgresql://nota@127.0.0.1:5433/nota npm run env:local`. To resume a stopped project database, run `docker start nota-postgres`.

Strapi seeds an empty database with one published Homepage and its Media Library uploads on the first start. The seed reuses named uploads on retry and preserves any existing homepage draft or publication. Set `SEED_HOMEPAGE=false` after the initial publish if you want an empty database to require manual initialization. The shared seed inputs live in `src/content/homepage.ts`, `public/images` and `public/animations`.

For independent frontend development, run `CONTENT_SOURCE=local npm run dev`. CMS mode reads only published Strapi content. If the CMS is unavailable, the page shows a service error and the readiness endpoint returns 503.

## Check the local project

1. On desktop, scroll through the product chapters and back to see the animations reverse. At a tablet or phone size, open the menu using the middle dots and tap the Smartpaper and finish selectors to change images. [Local homepage](http://127.0.0.1:3000/)
2. Sign in with your local Strapi admin account. Open **Content Manager → Homepage**, then select **Draft** to edit the content. [Local Strapi admin](http://127.0.0.1:1337/admin)
3. To verify the form, use the homepage’s order button and send a test message with a test email such as `nota-check@example.test`. Open **Content Manager → Inquiry** in Strapi to see the saved message.

If you have already installed dependencies and generated the local environment files, restart a stopped stack from the repository root with `docker start nota-postgres`, followed by `npm --prefix cms run dev` in one terminal and `npm run dev` in another. Use Node 22 in both terminals. The database and uploads are reused.

The CMS dev command builds the admin panel before starting Strapi. This avoids the duplicate router context that could crash Homepage document actions. Strapi runs in development mode with an editable Content-Type Builder. When updating a running local stack, stop the CMS process, run `npm --prefix cms run dev` again, and reload the admin tab once the server is ready. [Strapi development command](https://docs.strapi.io/cms/cli#strapi-develop)

### Edit homepage SEO in Strapi

Open **Content Manager → Homepage → Draft → Search and social metadata**. The page title, page description, and social preview image are required. The other fields can be filled or cleared individually.

| Fields | Where they appear |
| --- | --- |
| Page title, page description, canonical URL, keywords | Browser tab and page metadata. Use an absolute HTTPS address for the canonical URL when there is a public URL. |
| Open Graph title, description, site name, preview image and alt text | Link previews. Empty title and description fields inherit the page values. |
| X card layout, handle, title, description, image and alt text | X link previews. Empty title, description and image fields inherit the Open Graph values. |
| Browser tab icon | The favicon. Choose an image from the Media Library. |
| Google and Bing verification | Public verification meta tags. Enter the token from the provider’s HTML tag. |
| Structured data (JSON-LD) | Schema.org markup. Enter a JSON object or an array of objects. |

Change the **Page title** and click **Save**. Reload the homepage to confirm the browser tab still shows the published title. Click **Publish** in Strapi and reload again to see the new title. In the browser’s developer tools, search **Elements** for `og:title`, `twitter:card`, `rel="canonical"`, or `application/ld+json` to check other published fields. You can also check the published values in the [local homepage API](http://127.0.0.1:1337/api/public-homepage).

Here is a starter JSON-LD object. Replace the name and URL with the page’s public values before publishing it.

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "NŌTA",
  "url": "https://example.com/"
}
```

The assignment requires `noindex, nofollow` on the homepage. Next.js sets those directives independently of the editor fields.

## Why this stack

Next.js 15 App Router and TypeScript provide server-side content loading, editable metadata, and a same-origin inquiry endpoint. Strapi 5.62 and PostgreSQL handle editing, publication and form persistence. On desktop, the GSAP ScrollTrigger and Lenis stack synchronizes timelines and scene controls with document scroll. Tablet and phone layouts use native scrolling, a top drawer, and manually selected Smartpaper and finish slides. Desktop visitors using reduced motion can read every chapter in document order.

The desktop and mobile implementations share the same content. Responsive image sources preserve the mobile crops, and locally served Instrument Serif and DM Sans remove the runtime font CDN dependency.

The desktop hero uses Lottie Web on canvas to render the original pen image sequence. ScrollTrigger selects the frame as the visitor scrolls through the pinned hero. [Original Lottie asset](https://nota.uprock.pro/f/0_refinedcover_03_09.json)

## Content model

Content Manager exposes one **Homepage** single type with Draft & Publish and an **Inquiry** collection.

| Editor fields | What they control |
| --- | --- |
| Brand, navigation, hero and menu art | Wordmark, symbol, menu links, headline, order label and price |
| Specifications, manifesto and audience | Pen close-ups, specification groups and bullets, philosophy and audience copy |
| Smartpaper chapters | Four ordered media scenes, including AI structure and phone synchronization |
| Box contents and detail gallery | The presentation set, component cards, product overview and annotated macro imagery |
| Finishes | Chapter images, names, taglines, six-digit background tones and caption contrast |
| Footer, inquiry copy and SEO | Footer links and credits, form labels and feedback, search metadata, social cards and structured data |
| Inquiry | Name, email, message and Strapi-managed creation date |

Use **Content Manager → Homepage → Draft** to edit the labelled sections. Upload replacement artwork using the Media Library. Artwork has a main image, optional mobile image and editable alt text. Save the draft, then select **Publish** when it is ready to appear on the homepage. Next.js requests `GET /api/public-homepage` with its cache bypassed. Strapi explicitly populates the nested components and images and returns the published document.

In **Hero**, use **Desktop Lottie animation** to replace the default animation with a standalone Lottie JSON export containing embedded images. Turn off **Play desktop pen animation** to use the CMS hero photos. The optional **Desktop full pen profile** supplies the pullback when the animation is disabled or unavailable. Use a transparent side-on image with proportions close to 896 × 141. The seeded horizontal specification photo supplies the profile when that field is empty.

In **Box contents**, the optional **Hover image** supplies the alternate photo on pointer hover and keyboard focus. The seeded Charging Adapter uses a full view of the adapter. Keep the alternate photo in the same proportions as the primary photo.

Visitors send JSON to `POST /api/inquiry` on Next.js. Both loopback addresses, `localhost` and `127.0.0.1`, work on the configured local frontend port. Both servers validate the fields and honeypot. The proxy caps the request at 24 KiB, authenticates to Strapi with a dedicated shared secret, and returns success after the database write. Strapi allows five valid attempts per IP or email within a minute, with an additional application-wide cap. Open **Content Manager → Inquiry** to see submissions with the newest ones first.

## Verification

```sh
npm run typecheck
npm run lint
npm run build
npm --prefix cms run build
npx playwright install chromium
npm run test:e2e
```

The Playwright suite covers 320×640, 390×844, 768×1024, 952×840, 1024×768, 1366×1024, 1440×900 and 1920×1080. It checks image decoding, overflow, desktop pins and wheel reversal, native touch scrolling, drawer controls, scene selectors, keyboard focus, and reduced motion. With an existing production build running, use `TEST_BASE_URL=http://127.0.0.1:3000 npm run test:e2e`. Setting `PLAYWRIGHT_CHANNEL=chrome` uses installed Google Chrome.

The CMS workflow test signs in to Strapi, opens Homepage document actions, and saves and publishes a new SEO title in the editor. It checks draft isolation, image and Lottie uploads, published browser metadata and JSON-LD, and a persisted inquiry from `localhost`. Use a disposable PostgreSQL database for it. Start Strapi with that database’s `DATABASE_URL` and a temporary `STRAPI_PUBLIC_DIR` containing an empty `uploads/` directory. Point the running frontend at that Strapi instance. Set `TEST_CMS_ADMIN_PASSWORD` to a strong password for the synthetic test account, then run the command below. The test restores the original homepage after publishing the test edit.

```sh
TEST_BASE_URL=http://127.0.0.1:3000 TEST_CMS_URL=http://127.0.0.1:1337 npm run test:e2e -- tests/cms.spec.ts
```

Both application images were built and run locally with PostgreSQL on a private container network. The browser suite passed against this stack. All 32 original upload checksums and five synthetic inquiry rows held after replacing the CMS container with the same volumes and seeding disabled.

For a production-mode rehearsal, run `NEXT_STANDALONE=1 npm run build` after the CMS is running and `.env.local` exists. Copy `.next/static` into `.next/standalone/.next/` and `public` into `.next/standalone/`. Start it with `HOSTNAME=127.0.0.1 PORT=3000 node --env-file=.env.local .next/standalone/server.js`. The frontend container assembles these files when it builds.

## Railway

The [Railway infrastructure definition](.railway/railway.ts) declares three services and a persistent CMS volume. Both app services build from the repository root because they share inquiry validation and the CMS seed inputs. Each service has its own Dockerfile, watch paths, and readiness check.

| Service | Build and runtime | Networking and storage |
| --- | --- | --- |
| `frontend` | `deploy/frontend.Dockerfile`, Next.js standalone on port 3000 | Public HTTPS for visitors. Server calls Strapi over its private DNS name. |
| `cms` | `deploy/cms.Dockerfile`, Strapi API and admin on port 1337 | Public HTTPS for the admin and media. Upload volume mounted at `/app/cms/public/uploads`. |
| `Postgres` | Railway-managed PostgreSQL with its database volume | Strapi uses the internal `DATABASE_URL`. Keep the database on the private network. |

1. Sign in to Railway and link a new project with `railway login` and `railway link`. Use the current [Railway infrastructure CLI](https://docs.railway.com/infrastructure-as-code).
2. Add shared Railway variables named `NOTA_APP_KEYS`, `NOTA_ADMIN_JWT_SECRET`, `NOTA_API_TOKEN_SALT`, `NOTA_TRANSFER_TOKEN_SALT`, `NOTA_ENCRYPTION_KEY` and `NOTA_INQUIRY_PROXY_SECRET`. Generate each secret with `openssl rand -hex 32`. Use four independently generated values, separated by commas, for `NOTA_APP_KEYS`.
3. Run `railway config plan` and `railway config apply` to create the service graph. Generate a public domain for each app service and point them at ports 3000 and 1337. The application vars resolve the domains using Railway’s service references. Confirm the CMS volume mount before deployment. [Railway volumes](https://docs.railway.com/volumes)
4. Connect both app services to the approved GitHub repository and `main` branch, or set `NOTA_GITHUB_REPO=owner/repository` when running the plan and apply commands after granting Railway repository access. Let Strapi seed and become ready first. Both apps use `/api/health` for readiness.
5. Open the public Strapi `/admin`, register the owner, and invite the named reviewers in Settings → Administration panel → Users. Give each reviewer the role agreed with the assignment owner. Verify individual access and share the private GitHub repository with the approved reviewer accounts.
6. Check the frontend over HTTPS, the `noindex, nofollow` HTML metadata and response header, and `/robots.txt`. Submit a test inquiry, publish a reversible content change, then redeploy Strapi and check that the same uploaded media URLs and inquiry records survive.

For the under-ten-minute recording, show the three Railway services, their deployment health, which variables refer to other services, the private PostgreSQL connection, the exact uploads mount, and a Strapi edit that appears on the live site after publishing. Keep variable values and credentials hidden. The assignment owner submits the live URLs, GitHub access, recording and README by **November 21, 2026 at 9:00 a.m. Sri Lanka time**. [Submission form](https://forms.gle/eevrjozsy7PXE4m97)

## Trade-offs and follow-up

The macro shots use permitted still imagery with desktop scroll motion and time-based zooms. Tablet, phone and reduced-motion visitors see the responsive hero photos. Tablet and phone visitors can browse all four Smartpaper scenes and all five finishes using the chapter controls. The inquiry uses the assignment’s name, email and message fields.

The local media provider and volume make deployment and backups straightforward for one CMS replica. A larger deployment could move uploads to object storage, use a shared rate limiter, and add visual regression baselines for additional browsers and physical devices.

The production npm audit reported zero frontend findings and remaining transitive findings in the Strapi 5 stack. The project uses the compatible PostCSS and Zod 4 patches and retains the framework versions listed above.

The standalone `preview/index.html` is a historical V3 artifact. The Next.js app is the submission frontend.

## AI tools

OpenAI ChatGPT helped draft the original V3 frontend and project brief. OpenAI Codex continued the existing project, inspected rendered reference pages in Chromium, implemented the frontend refinements and scroll interactions, built the Strapi integration, wrote the Railway configuration, and ran the validation. The assignment owner should review and be able to explain the submitted code.

Original product design and imagery belong to their creators. The demo is configured for non-indexing and should be taken down after the review round.
