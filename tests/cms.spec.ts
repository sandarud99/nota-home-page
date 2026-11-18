import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type APIResponse } from '@playwright/test';

const cmsUrl = process.env.TEST_CMS_URL;
const frontendUrl = process.env.TEST_BASE_URL;
const adminPassword = process.env.TEST_CMS_ADMIN_PASSWORD;
const adminEmail = 'nota-e2e-admin@example.test';
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

type Asset = { id: number; url: string };
type HomepageDraft = {
  headerWordmark: string;
  hero: { id: number; image: Asset };
  seo: { id: number; metaTitle: string };
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
    const editor = await dataOf<{ contentType: { metadatas: Record<string, { edit: { label: string } }> } }>(
      await cms.get(`/content-manager/content-types/${uid}/configuration`, auth),
    );
    expect(editor.contentType.metadatas.paperDetails.edit.label).toBe('Smartpaper chapters');
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
    const title = `Nōta editorial test ${id}`;
    const description = 'An audience description edited from Strapi.';
    const apiHomepage = async () => dataOf<HomepageDraft>(await cms.get('/api/public-homepage'));
    const publish = async () => expect(await cms.post(`${homepagePath}/actions/publish`, { ...auth, data: {} })).toBeOK();

    try {
      const saved = await cms.put(homepagePath, {
        ...auth,
        data: {
          headerWordmark: title,
          hero: { id: original.hero.id, image: asset.id },
          seo: { id: original.seo.id, metaTitle: title },
          audienceHeading: { id: original.audienceHeading.id, description },
        },
      });
      await expect(saved).toBeOK();

      const draftOnly = await apiHomepage();
      expect(draftOnly.headerWordmark).toBe(original.headerWordmark);
      expect(draftOnly.hero.image.url).toBe(original.hero.image.url);
      expect(draftOnly.seo.metaTitle).toBe(original.seo.metaTitle);

      await publish();
      await page.goto(frontendUrl);
      await expect(page.locator('.site-header .brand')).toHaveText(title);
      await expect(page).toHaveTitle(title);
      await expect(page.locator('.hero-pen img')).toHaveAttribute('src', publicImage);
      await expect(page.locator('.hero-pen img')).toHaveJSProperty('complete', true);
      expect(await page.locator('.hero-pen img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await expect(page.getByText(description)).toBeVisible();
    } finally {
      const current = await dataOf<HomepageDraft>(await cms.get(homepagePath, auth));
      await expect(await cms.put(homepagePath, {
        ...auth,
        data: {
          headerWordmark: original.headerWordmark,
          hero: { id: current.hero.id, image: original.hero.image.id },
          seo: { id: current.seo.id, metaTitle: original.seo.metaTitle },
          audienceHeading: { id: current.audienceHeading.id, description: original.audienceHeading.description },
        },
      })).toBeOK();
      await publish();
      await expect(await cms.delete(`/upload/files/${asset.id}`, auth)).toBeOK();
    }

    const inquiry = { name: 'Local Test', email: `nota-test-${id}@example.test`, message: 'Checking the locally published Nōta homepage.' };
    const localhost = new URL(frontendUrl);
    localhost.hostname = 'localhost';
    const route = new URL('/api/inquiry', localhost).href;
    const otherOrigin = new URL(localhost);
    otherOrigin.port = localhost.port === '3100' ? '3101' : '3100';
    expect((await page.request.post(route, { data: inquiry, headers: { Origin: otherOrigin.origin } })).status()).toBe(403);
    expect((await page.request.post(route, { data: { ...inquiry, website: 'bot' } })).status()).toBe(400);
    expect((await cms.get('/api/inquiries')).status()).toBe(404);

    await page.goto(localhost.href);
    await page.getByRole('button', { name: /Order Nota One/ }).click();
    const form = page.getByRole('dialog', { name: 'Stay ahead' });
    await form.getByRole('textbox', { name: 'Name', exact: true }).fill(inquiry.name);
    await form.getByRole('textbox', { name: 'E-mail' }).fill(inquiry.email);
    await form.getByRole('textbox', { name: 'Message' }).fill(inquiry.message);
    const submitted = page.waitForResponse(response => response.url() === route && response.request().method() === 'POST');
    await form.getByRole('button', { name: 'Notify me' }).click();
    expect((await submitted).status()).toBe(201);
    await expect(form.getByRole('status')).toContainText('Your inquiry was received');

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
