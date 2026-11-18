import type { Metadata, Viewport } from 'next';
import { getHomepage, mediaUrl } from '@/lib/strapi';
import { homepageData } from '@/content/homepage';
import type { Homepage } from '@/lib/strapi';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-ext-400.css';
import '@fontsource-variable/dm-sans';
import 'lenis/dist/lenis.css';
import './globals.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  let homepage: Homepage = homepageData as Homepage;
  if (process.env.CONTENT_SOURCE === 'strapi') {
    try { homepage = await getHomepage(); } catch { /* retain a safe noindex error-page title */ }
  }
  const title = homepage.seo?.metaTitle || homepage.brand;
  const description = homepage.seo?.metaDescription || '';
  const image = mediaUrl(homepage.seo?.ogImage, homepage.seo?.ogImageUrl);
  return {
    title, description,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: { title, description, type: 'website', images: image?.startsWith('http') ? [image] : [] },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
