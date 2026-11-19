import 'server-only';
import { cache } from 'react';
import { homepageData } from '@/content/homepage';
import type { Artwork, BoxItemContent, Homepage, Media } from './strapi';

const localMediaOrigin = 'http://127.0.0.1:1337';

function resolveMedia(file: Media | null | undefined, origin: URL): Media {
  if (!file?.url || file.url.startsWith('//')) throw new Error('A required homepage image is missing.');
  const url = new URL(file.url, origin);
  if (url.username || url.password ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.origin === origin.origin && !process.env.RAILWAY_ENVIRONMENT_ID))) {
    throw new Error('Invalid public homepage media URL.');
  }
  return { ...file, url: url.href };
}

export const getHomepage = cache(async (): Promise<Homepage> => {
  if (process.env.CONTENT_SOURCE === 'local' ||
      (!process.env.CONTENT_SOURCE && process.env.NODE_ENV === 'development')) return homepageData;
  const response = await fetch(new URL('/api/public-homepage', process.env.STRAPI_URL || localMediaOrigin), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`Homepage CMS request failed (HTTP ${response.status}).`);
  const { data } = await response.json() as { data?: Homepage };
  if (!data?.hero?.title || !data.manifesto || !data.seo?.metaTitle ||
      !data.navigation?.length || !data.specifications?.length || !data.audiences?.length ||
      !data.paperDetails?.length || !data.boxItems?.length || !data.boxCallouts?.length || !data.colors?.length || !data.formCopy?.title) {
    throw new Error('Published homepage content is incomplete.');
  }

  const origin = new URL(process.env.STRAPI_PUBLIC_URL || localMediaOrigin);
  if (process.env.RAILWAY_ENVIRONMENT_ID && origin.protocol !== 'https:') {
    throw new Error('Configure the browser-facing HTTPS Strapi URL.');
  }
  const withArt = <T extends Artwork>(item: T): T => ({
    ...item,
    image: resolveMedia(item.image, origin),
    mobileImage: item.mobileImage ? resolveMedia(item.mobileImage, origin) : null,
  });
  const withBoxArt = (item: BoxItemContent): BoxItemContent => ({
    ...withArt(item),
    hoverImage: item.hoverImage ? resolveMedia(item.hoverImage, origin) : null,
  });

  return {
    ...data,
    brandMark: withArt(data.brandMark),
    hero: {
      ...withArt(data.hero),
      profileImage: data.hero.profileImage ? resolveMedia(data.hero.profileImage, origin) : null,
      animation: data.hero.animation ? resolveMedia(data.hero.animation, origin) : null,
    },
    menuArtwork: withArt(data.menuArtwork),
    specsArtwork: withArt(data.specsArtwork),
    aboutArtwork: withArt(data.aboutArtwork),
    paperDetails: data.paperDetails.map(withArt),
    boxSet: withBoxArt(data.boxSet),
    boxItems: data.boxItems.map(withBoxArt),
    boxCallouts: data.boxCallouts.map(withArt),
    colors: data.colors.map(withArt),
    seo: {
      ...data.seo,
      ogImage: resolveMedia(data.seo.ogImage, origin),
      twitterImage: data.seo.twitterImage ? resolveMedia(data.seo.twitterImage, origin) : null,
      siteIcon: data.seo.siteIcon ? resolveMedia(data.seo.siteIcon, origin) : null,
    },
  };
});
