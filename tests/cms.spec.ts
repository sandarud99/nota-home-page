import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type APIResponse } from '@playwright/test';
import type { HomepageSeo } from '../src/lib/strapi';

const cmsUrl = process.env.TEST_CMS_URL;
const frontendUrl = process.env.TEST_BASE_URL;
const adminPassword = process.env.TEST_CMS_ADMIN_PASSWORD;
const adminEmail = 'nota-e2e-admin@example.test';
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

type Asset = { id: number; url: string };
type SeoDraft = Omit<HomepageSeo, 'ogImage' | 'twitterImage' | 'siteIcon'> & {
  id: number;
  ogImage: Asset;
  twitterImage?: Asset | null;
  siteIcon?: Asset | null;
};
type EditorLabels = { metadatas: Record<string, { edit: { label: string } }> };
type HomepageDraft = {
  headerWordmark: string;
  hero: {
    id: number;
    image: Asset;
    profileImage?: Asset | null;
    animation?: Asset | null;
    animationEnabled?: boolean;
  };
  seo: SeoDraft;
  audienceHeading: { id: number; description: string | null };
};

async function dataOf<T>(response: APIResponse): Promise<T> {
  await expect(response).toBeOK();
  return (await response.json()).data as T;
}

test.use({ trace: 'off' });
test.skip(!cmsUrl || !frontendUrl || !adminPassword, 'Run against a disposable local CMS with a test admin password.');

test('published CMS edits and uploads appear on the homepage, and localhost inquiries are saved', async ({ page, playwright }) => {
  if (!cmsUrl || !frontendUrl || !adminPassword || [cmsUrl, frontendUrl].some(url => !loopbackHosts.has(new URL(url).hostname))) {
    throw new Error('The CMS workflow test requires loopback URLs for both services.');
  }

  const cms = await playwright.request.newContext({ baseURL: cmsUrl });
  const uid = 'api::homepage.homepage';
  const homepagePath = `/content-manager/single-types/${uid}`;
  const inquiryPath = '/content-manager/collection-types/api::inquiry.inquiry';
  try {
    const { hasAdmin } = await dataOf<{ hasAdmin: boolean }>(await cms.get('/admin/init'));
    const session = await cms.post(hasAdmin ? '/admin/login' : '/admin/register-admin', {
      data: hasAdmin
        ? { email: adminEmail, password: adminPassword }
        : { email: adminEmail, password: adminPassword, firstname: 'Test', lastname: 'Editor' },
    });
    const { token } = await dataOf<{ token: string }>(session);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const editor = await dataOf<{ contentType: EditorLabels; components: Record<string, EditorLabels> }>(
      await cms.get(`/content-manager/content-types/${uid}/configuration`, auth),
    );
    expect(editor.contentType.metadatas.paperDetails.edit.label).toBe('Smartpaper chapters');
    expect(editor.components['shared.seo'].metadatas.structuredData.edit.label).toBe('Structured data (JSON-LD)');
    expect(editor.components['shared.hero'].metadatas.animation.edit.label).toBe('Desktop Lottie animation');

    const editorPage = await page.context().newPage();
    const adminErrors: string[] = [];
    editorPage.on('pageerror', error => adminErrors.push(error.message));
    editorPage.on('console', message => {
      if (message.type() === 'error' && message.text().includes('useNavigate()')) {
        adminErrors.push(message.text());
      }
    });
    await editorPage.goto(new URL('/admin/auth/login', cmsUrl).href);
    await editorPage.locator('input[name="email"]').fill(adminEmail);
    await editorPage.locator('input[name="password"]').fill(adminPassword);
    await editorPage.getByRole('button', { name: 'Login', exact: true }).click();
    await editorPage.getByRole('link', { name: 'Content Manager', exact: true }).click();
    await editorPage.getByRole('link', { name: 'Homepage', exact: true }).click();
    await editorPage.getByRole('button', { name: 'More document actions', exact: true }).first().press('Enter');
    await expect(editorPage.getByRole('menu')).toBeVisible();
    await editorPage.keyboard.press('Escape');
    const skipTour = editorPage.getByRole('button', { name: 'Skip', exact: true });
    if (await skipTour.isVisible()) await skipTour.click();
    expect(adminErrors).toEqual([]);

    const original = await dataOf<HomepageDraft>(await cms.get(homepagePath, auth));
    const id = randomUUID().slice(0, 8);
    const uploaded = await cms.post('/upload', {
      ...auth,
      multipart: {
        files: { name: `nota-test-${id}.webp`, mimeType: 'image/webp', buffer: await readFile('public/images/box-pen.webp') },
      },
    });
    await expect(uploaded).toBeOK();
    const [asset] = await uploaded.json() as Asset[];
    const publicImage = new URL(asset.url, cmsUrl).href;
    const uploadedAnimation = await cms.post('/upload', {
      ...auth,
      multipart: {
        files: { name: `nota-motion-test-${id}.json`, mimeType: 'application/json', buffer: await readFile('public/animations/nota-pen.json') },
      },
    });
    await expect(uploadedAnimation).toBeOK();
    const [animation] = await uploadedAnimation.json() as Asset[];
    const publicAnimation = new URL(animation.url, cmsUrl).href;
    const title = `Nōta editorial test ${id}`;
    const description = 'An audience description edited from Strapi.';
    const seo = {
      metaDescription: 'The homepage description edited in the CMS.',
      canonicalUrl: 'https://nota.example.test/',
      keywords: 'smart pen,  paper notes ,',
      ogTitle: 'Nōta link preview',
      ogDescription: 'Edited Open Graph description.',
      ogSiteName: 'Nōta Studio',
      ogImage: asset.id,
      ogImageAlt: 'Close-up of the smart pen',
      twitterCard: 'summary',
      twitterSite: '@notastudio',
      twitterTitle: 'Nōta X preview',
      twitterDescription: 'Edited X card description.',
      twitterImage: original.hero.image.id,
      twitterImageAlt: 'Smart pen from above',
      siteIcon: asset.id,
      googleVerification: 'nota-google-test-token',
      bingVerification: 'nota-bing-test-token',
      structuredData: [
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Nōta <Studio>' },
        { '@context': 'https://schema.org', '@type': 'Organization', name: 'Nōta' },
      ],
    };
    const apiHomepage = async () => dataOf<HomepageDraft>(await cms.get('/api/public-homepage'));
    const publish = async () => expect(await cms.post(`${homepagePath}/actions/publish`, { ...auth, data: {} })).toBeOK();

    try {
      const saved = await cms.put(homepagePath, {
        ...auth,
        data: {
          headerWordmark: title,
          hero: { id: original.hero.id, image: asset.id, profileImage: asset.id, animation: animation.id, animationEnabled: true },
          seo: { id: original.seo.id, metaTitle: original.seo.metaTitle, ...seo },
          audienceHeading: { id: original.audienceHeading.id, description },
        },
      });
      await expect(saved).toBeOK();

      await editorPage.reload();
      const pageTitle = editorPage.getByRole('textbox', { name: /Page title/ });
      await expect(pageTitle).toHaveValue(original.seo.metaTitle);
      await pageTitle.fill(title);
      const saveButton = editorPage.getByRole('button', { name: 'Save', exact: true });
      await expect(saveButton).toBeEnabled();
      const [savedInAdmin] = await Promise.all([
        editorPage.waitForResponse(response => new URL(response.url()).pathname === homepagePath && response.request().method() === 'PUT'),
        saveButton.click(),
      ]);
      expect(savedInAdmin.ok()).toBe(true);

      const draftOnly = await apiHomepage();
      expect(draftOnly.headerWordmark).toBe(original.headerWordmark);
      expect(draftOnly.hero.image.url).toBe(original.hero.image.url);
      expect(draftOnly.hero.profileImage?.url).toBe(original.hero.profileImage?.url);
      expect(draftOnly.hero.animation?.url).toBe(original.hero.animation?.url);
      expect(draftOnly.hero.animationEnabled).toBe(original.hero.animationEnabled);
      expect(draftOnly.seo).toMatchObject({
        metaTitle: original.seo.metaTitle,
        canonicalUrl: original.seo.canonicalUrl,
        structuredData: original.seo.structuredData,
      });
      await page.goto(frontendUrl);
      await expect(page).toHaveTitle(original.seo.metaTitle);

      const publishButton = editorPage.getByRole('button', { name: 'Publish', exact: true });
      await expect(publishButton).toBeEnabled();
      const [publishedInAdmin] = await Promise.all([
        editorPage.waitForResponse(response => new URL(response.url()).pathname === `${homepagePath}/actions/publish` && response.request().method() === 'POST'),
        publishButton.click(),
      ]);
      expect(publishedInAdmin.ok()).toBe(true);
      expect(adminErrors).toEqual([]);
      await editorPage.close();
      const response = await page.reload();
      await expect(page.locator('.site-header .brand')).toHaveText(title);
      await expect(page).toHaveTitle(title);
      await expect(page.locator('.hero-pen img')).toHaveAttribute('src', publicImage);
      await expect(page.locator('.hero-pen img')).toHaveJSProperty('complete', true);
      expect(await page.locator('.hero-pen img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await expect(page.locator('.hero-profile[data-ready] img')).toHaveJSProperty('currentSrc', publicImage);
      await expect(page.locator('.hero-motion')).toHaveAttribute('data-source', publicAnimation);
      await expect(page.locator('.hero-motion')).toHaveAttribute('data-frame', '0');
      await expect(page.getByText(description)).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveJSProperty('href', seo.canonicalUrl);
      await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', publicImage);
      const shareUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
      expect(new URL(shareUrl ?? '').href).toBe(seo.canonicalUrl);
      const openGraph = {
        'og:title': seo.ogTitle,
        'og:description': seo.ogDescription,
        'og:site_name': seo.ogSiteName,
        'og:image': publicImage,
        'og:image:alt': seo.ogImageAlt,
      };
      for (const [property, content] of Object.entries(openGraph)) {
        await expect(page.locator(`meta[property="${property}"]`)).toHaveAttribute('content', content);
      }
      const meta = {
        description: seo.metaDescription,
        keywords: 'smart pen,paper notes',
        'twitter:card': seo.twitterCard,
        'twitter:site': seo.twitterSite,
        'twitter:title': seo.twitterTitle,
        'twitter:description': seo.twitterDescription,
        'twitter:image': new URL(original.hero.image.url, cmsUrl).href,
        'twitter:image:alt': seo.twitterImageAlt,
        'google-site-verification': seo.googleVerification,
        'msvalidate.01': seo.bingVerification,
        robots: 'noindex, nofollow',
      };
      for (const [name, content] of Object.entries(meta)) {
        await expect(page.locator(`meta[name="${name}"]`)).toHaveAttribute('content', content);
      }
      expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
      const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
      expect(jsonLd).toContain('Nōta \\u003cStudio>');
      expect(JSON.parse(jsonLd ?? '')).toEqual(seo.structuredData);

      await expect(await cms.put(homepagePath, {
        ...auth,
        data: { hero: { id: original.hero.id, animationEnabled: false } },
      })).toBeOK();
      await publish();
      await page.reload();
      await expect(page.locator('.hero-motion')).toHaveCount(0);
      await expect(page.locator('.hero-camera')).toHaveCSS('opacity', '1');
    } finally {
      const current = await dataOf<HomepageDraft>(await cms.get(homepagePath, auth));
      const { ogImage, twitterImage, siteIcon, ...originalSeo } = original.seo;
      await expect(await cms.put(homepagePath, {
        ...auth,
        data: {
          headerWordmark: original.headerWordmark,
          hero: {
            id: current.hero.id,
            image: original.hero.image.id,
            profileImage: original.hero.profileImage?.id ?? null,
            animation: original.hero.animation?.id ?? null,
            animationEnabled: original.hero.animationEnabled ?? true,
          },
          seo: {
            ...originalSeo,
            id: current.seo.id,
            ogImage: ogImage.id,
            twitterImage: twitterImage?.id ?? null,
            siteIcon: siteIcon?.id ?? null,
          },
          audienceHeading: { id: current.audienceHeading.id, description: original.audienceHeading.description },
        },
      })).toBeOK();
      await publish();
      await expect(await cms.delete(`/upload/files/${asset.id}`, auth)).toBeOK();
      await expect(await cms.delete(`/upload/files/${animation.id}`, auth)).toBeOK();
    }

    const inquiry = { email: `nota-test-${id}@example.test` };
    const localhost = new URL(frontendUrl);
    localhost.hostname = 'localhost';
    const route = new URL('/api/inquiry', localhost).href;
    const otherOrigin = new URL(localhost);
    otherOrigin.port = localhost.port === '3100' ? '3101' : '3100';
    expect((await page.request.post(route, { data: inquiry, headers: { Origin: otherOrigin.origin } })).status()).toBe(403);
    expect((await page.request.post(route, { data: { ...inquiry, website: 'bot' } })).status()).toBe(400);
    expect((await page.request.post(route, { data: { email: 'invalid-email' } })).status()).toBe(400);
    expect((await cms.get('/api/inquiries')).status()).toBe(404);

    await page.goto(localhost.href);
    await page.getByRole('button', { name: /Order Nota One/ }).click();
    const form = page.getByRole('dialog');
    await expect(form).toHaveAccessibleName('Stay ahead');
    await expect(form.getByRole('textbox')).toHaveCount(1);
    await form.getByRole('textbox', { name: 'E-mail' }).fill(inquiry.email);
    const submitted = page.waitForResponse(response => response.url() === route && response.request().method() === 'POST');
    await form.getByRole('button', { name: 'Notify me' }).click();
    expect((await submitted).status()).toBe(201);
    await expect(form.getByRole('heading')).toHaveText('All set. We’ll keep you posted');
    await expect(form.getByRole('textbox')).toHaveCount(0);
    await expect(form.getByRole('button', { name: 'Close' })).toBeFocused();

    const list = await cms.get(inquiryPath, { ...auth, params: { 'filters[email][$eq]': inquiry.email } });
    await expect(list).toBeOK();
    const { results } = await list.json() as { results: Array<typeof inquiry & { documentId: string }> };
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject(inquiry);
    await expect(await cms.delete(`${inquiryPath}/${results[0].documentId}`, auth)).toBeOK();
  } finally {
    await cms.dispose();
  }
});
