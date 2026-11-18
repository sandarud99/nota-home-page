import type { Metadata, Viewport } from 'next';
import { getHomepage } from '@/lib/homepage-server';
import { mediaUrl } from '@/lib/strapi';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-ext-400.css';
import '@fontsource-variable/dm-sans';
import 'lenis/dist/lenis.css';
import './globals.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  const robots = { index: false, follow: false, googleBot: { index: false, follow: false } };
  try {
    const { seo } = await getHomepage();
    const image = mediaUrl(seo.ogImage, seo.ogImageUrl);
    const title = seo.metaTitle;
    const description = seo.metaDescription;
    return {
      title,
      description,
      robots,
      metadataBase: new URL(process.env.FRONTEND_PUBLIC_URL || 'http://127.0.0.1:3000'),
      openGraph: { title, description, type: 'website', images: image ? [image] : [] },
    };
  } catch {
    return { title: 'Homepage temporarily unavailable', robots };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
