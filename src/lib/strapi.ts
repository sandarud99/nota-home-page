export type Media = {
  url: string;
  alternativeText?: string | null;
  width?: number;
  height?: number;
};

export type Artwork = {
  image?: Media | null;
  mobileImage?: Media | null;
  imageUrl?: string;
  mobileImageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  mobileImageWidth?: number;
  mobileImageHeight?: number;
  alt?: string;
};

export type NavLink = { id?: number; label: string; href: string };
export type Heading = { title: string; description?: string };
export type SectionItem = Artwork & {
  id?: number;
  title: string;
  description?: string;
  bullets?: { id?: number; text: string }[];
};

export type BoxItemContent = SectionItem & { hoverImage?: Media | null; hoverImageUrl?: string };

export type Feature = Artwork & {
  id?: number;
  title: string;
  caption: string;
  description: string;
};

export type Finish = SectionItem & { tone: string; darkText?: boolean };

export type FormCopy = {
  title: string;
  description: string;
  emailLabel: string;
  submitLabel: string;
  closeLabel: string;
  sendingLabel: string;
  successMessage: string;
  errorMessage: string;
  retryMessage: string;
};

export type HomepageSeo = {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string | null;
  keywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogSiteName?: string | null;
  ogImage?: Media | null;
  ogImageUrl?: string;
  ogImageAlt?: string | null;
  twitterCard?: 'summary' | 'summary_large_image' | null;
  twitterSite?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: Media | null;
  twitterImageAlt?: string | null;
  siteIcon?: Media | null;
  googleVerification?: string | null;
  bingVerification?: string | null;
  structuredData?: Record<string, unknown> | Record<string, unknown>[] | null;
};

export type Homepage = {
  brand: string;
  headerWordmark: string;
  brandMark: Artwork;
  navigation: NavLink[];
  hero: Artwork & {
    title: string;
    priceLabel: string;
    price: string;
    ctaLabel: string;
    profileImage?: Media | null;
    animationEnabled?: boolean;
    animation?: Media | null;
    animationUrl?: string;
  };
  menuArtwork: Artwork;
  specsHeading: Heading;
  specsArtwork: Artwork;
  specifications: SectionItem[];
  manifesto: string;
  audienceHeading: Heading;
  audienceIntro: string;
  audiences: SectionItem[];
  aboutArtwork: Artwork;
  paperHeading: Heading;
  paperDetails: Feature[];
  boxHeading: Heading;
  boxSet: BoxItemContent;
  boxProductOverview: string;
  boxItems: BoxItemContent[];
  boxCallouts: SectionItem[];
  colorsHeading: Heading;
  colors: Finish[];
  footerDescription: string;
  footerNavigationLabel: string;
  footerLinks: NavLink[];
  footerYearLabel: string;
  footerYear: string;
  footerCopyright: string;
  footerCredit: string;
  footerProject: string;
  formCopy: FormCopy;
  seo: HomepageSeo;
};

const anchors = new Set(['#top', '#main', '#specifications', '#who-its-for', '#about', '#smartpaper', '#inside-the-box', '#finishes']);

export function safeHref(href: string) {
  if (anchors.has(href)) return href;
  try {
    const url = new URL(href);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* An invalid link falls back to the beginning of the homepage. */ }
  return '#top';
}

export function mediaUrl(media?: Media | null, localUrl?: string) {
  const url = media?.url || localUrl;
  if (!url) return undefined;
  if (!media?.url && url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const resolved = new URL(url);
    if (['https:', 'http:'].includes(resolved.protocol)) return resolved.href;
  } catch { /* An absent image can use the local artwork fallback. */ }
}
