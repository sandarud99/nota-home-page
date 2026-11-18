import type { Metadata, Viewport } from 'next';
import { getHomepage } from '@/lib/homepage-server';
import { mediaUrl, type Media } from '@/lib/strapi';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-ext-400.css';
import '@fontsource-variable/dm-sans';
import 'lenis/dist/lenis.css';
import './globals.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

function canonicalHref(value?: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.hash) return url.href;
  } catch {
    return undefined;
  }
}

function previewImage(file?: Media | null, alt?: string | null, localUrl?: string) {
  const url = mediaUrl(file, localUrl);
  if (!url) return undefined;
  return { url, alt: alt?.trim() || file?.alternativeText || undefined, width: file?.width || undefined, height: file?.height || undefined };
}

export async function generateMetadata(): Promise<Metadata> {
  const robots = { index: false, follow: false, googleBot: { index: false, follow: false } };
  try {
    const { seo, brand, brandMark } = await getHomepage();
    const canonical = canonicalHref(seo.canonicalUrl);
    const ogTitle = seo.ogTitle?.trim() || seo.metaTitle;
    const ogDescription = seo.ogDescription?.trim() || seo.metaDescription;
    const ogImage = previewImage(seo.ogImage, seo.ogImageAlt, seo.ogImageUrl);
    const twitterImage = previewImage(seo.twitterImage, seo.twitterImageAlt) ?? (ogImage && {
      ...ogImage,
      alt: seo.twitterImageAlt?.trim() || ogImage.alt,
    });
    const icon = mediaUrl(seo.siteIcon) || mediaUrl(brandMark.image, brandMark.imageUrl);
    const bingVerification = seo.bingVerification?.trim();
    return {
      title: seo.metaTitle,
      description: seo.metaDescription,
      robots,
      metadataBase: new URL(process.env.FRONTEND_PUBLIC_URL || 'http://127.0.0.1:3000'),
      alternates: canonical ? { canonical } : undefined,
      keywords: seo.keywords?.split(',').map(keyword => keyword.trim()).filter(Boolean),
      openGraph: {
        type: 'website',
        url: canonical,
        title: ogTitle,
        description: ogDescription,
        siteName: seo.ogSiteName?.trim() || brand,
        images: ogImage ? [ogImage] : [],
      },
      twitter: {
        card: seo.twitterCard || 'summary_large_image',
        site: seo.twitterSite || undefined,
        title: seo.twitterTitle?.trim() || ogTitle,
        description: seo.twitterDescription?.trim() || ogDescription,
        images: twitterImage ? [twitterImage] : [],
      },
      icons: icon ? { icon } : undefined,
      verification: {
        google: seo.googleVerification?.trim() || undefined,
        other: bingVerification ? { 'msvalidate.01': bingVerification } : undefined,
      },
    };
  } catch {
    return { title: 'Homepage temporarily unavailable', robots };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
