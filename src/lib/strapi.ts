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
  nameLabel: string;
  emailLabel: string;
  messageLabel: string;
  submitLabel: string;
  closeLabel: string;
  sendingLabel: string;
  successMessage: string;
  errorMessage: string;
  retryMessage: string;
};

export type Homepage = {
  brand: string;
  headerWordmark: string;
  brandMark: Artwork;
  navigation: NavLink[];
  hero: Artwork & { title: string; priceLabel: string; price: string; ctaLabel: string };
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
  boxSet: SectionItem;
  boxProductOverview: string;
  boxItems: SectionItem[];
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
  seo: { metaTitle: string; metaDescription: string; ogImage?: Media | null; ogImageUrl?: string };
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
  if (url.startsWith('/') && !url.startsWith('//')) {
    if (!media?.url) return url;
    return new URL(url, process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337').href;
  }
  try {
    const resolved = new URL(url);
    if (['https:', 'http:'].includes(resolved.protocol)) return resolved.href;
  } catch { /* An absent image can use the local artwork fallback. */ }
}

export async function getHomepage(): Promise<Homepage> {
  const base = process.env.STRAPI_URL || 'http://localhost:1337';
  const response = await fetch(new URL('/api/public-homepage', base), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Homepage CMS request failed (HTTP ${response.status})`);
  const json = await response.json() as { data?: Homepage };
  if (!json.data?.hero?.title) throw new Error('Published homepage content is incomplete.');
  return json.data;
}
