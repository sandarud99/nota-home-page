/** Local preview and initial CMS seed. Photos are permitted reference image assets. */
import type { Homepage } from '../lib/strapi';

const dimensions: Record<string, [number, number]> = {
  'box-adapter-mobile': [300, 440],
  'box-adapter': [900, 1000],
  'box-pen-mobile': [300, 440],
  'box-pen': [900, 1000],
  'box-set-mobile': [549, 805],
  'box-set': [1840, 1000],
  'bright-orange': [1920, 1080],
  'detail-barrel': [1223, 804],
  'detail-button': [450, 373],
  'detail-cap': [900, 787],
  'detail-finishes': [900, 1200],
  'detail-machining-mobile': [571, 476],
  'detail-machining': [430, 600],
  'detail-nib': [1920, 1080],
  'graphite': [1920, 1080],
  'hero-desktop': [1526, 364],
  'hero-mobile': [364, 1526],
  'mist-blue': [1920, 1080],
  'nota-mark': [38, 40],
  'order-desktop': [1472, 1008],
  'order-mobile': [600, 590],
  'paper-cover-mobile': [480, 1020],
  'paper-cover': [1920, 1080],
  'paper-open-mobile': [480, 1020],
  'paper-open': [1920, 1080],
  'paper-synced-mobile': [480, 1020],
  'paper-synced': [1920, 1080],
  'paper-written-mobile': [480, 1020],
  'paper-written': [1920, 1080],
  'precision-red': [1920, 1080],
  'silver': [1920, 1080],
  'spec-nib': [233, 734],
  'spec-profile': [896, 141],
};

function artwork(image: string, alt: string, mobileImage?: string) {
  const [imageWidth, imageHeight] = dimensions[image];
  const mobile = mobileImage ? {
    mobileImageUrl: `/images/${mobileImage}.webp`,
    mobileImageWidth: dimensions[mobileImage][0],
    mobileImageHeight: dimensions[mobileImage][1],
  } : {};
  return { alt, imageUrl: `/images/${image}.webp`, imageWidth, imageHeight, ...mobile };
}

const navigation = [
  { label: 'Specifications', href: '#specifications' },
  { label: "Who it's for", href: '#who-its-for' },
  { label: 'About', href: '#about' },
  { label: 'Inside the box', href: '#inside-the-box' },
];

const bullets = (...items: string[]) => items.map(text => ({ text }));

export const homepageData = {
  brand: 'NŌTA',
  headerWordmark: 'Nōta',
  brandMark: { imageUrl: '/images/nota-mark.svg', imageWidth: 38, imageHeight: 40, alt: '' },
  navigation,
  hero: {
    title: 'Smart pen\nfor real thinking',
    priceLabel: 'Nota One',
    price: '$300',
    ctaLabel: 'Order',
    animationUrl: '/animations/nota-pen.json',
    ...artwork('hero-desktop', 'Silver NŌTA fountain pen and nib', 'hero-mobile'),
  },
  menuArtwork: artwork('order-desktop', 'Two blue pen finishes', 'order-mobile'),
  specsHeading: { title: 'Nota pen\nSpecifications' },
  specsArtwork: artwork('spec-nib', 'Close-up of the fountain pen nib', 'spec-profile'),
  specifications: [
    { title: 'Writing System', bullets: bullets('Fountain pen nib', 'Natural ink flow', 'Replaceable fountain-pen ink cartridge', 'Designed for precise, expressive handwriting') },
    { title: 'Capture Technology', bullets: bullets('High-precision optical tracking', 'Real-time stroke capture', 'Line-by-line accuracy', 'Supports handwriting, diagrams, sketches') },
    { title: 'Digital Continuity', bullets: bullets('Notes sync automatically', 'Searchable over time', 'Structured with AI support', 'Ready when you return') },
  ],
  manifesto: 'Some thoughts need time, space, and a physical trace to exist. Writing by hand creates focus, presence, and a deeper connection with ideas. This tool is built around that simple truth.',
  audienceHeading: { title: "Who it's for" },
  audienceIntro: 'This tool is made for people who think on paper. It keeps handwriting natural and focused, letting you write the way you always have without distractions or screens getting in the way.\n\nEverything you write syncs to the app, where your notes are organized, searchable, and ready to work with AI when you need more clarity or structure.',
  audiences: [
    { title: 'Students & Learners', description: 'Handwritten notes stay personal and intuitive, but become searchable, organized, and easy to study. Lectures, ideas, and revisions are captured as they are — then supported by AI summaries, text recognition, and quick navigation when it matters most.' },
    { title: 'Creators, Designers & Architects', description: 'Sketches, diagrams, concepts, and fragments of ideas belong on paper. This tool makes sure they don’t disappear. Everything drawn or written is safely stored, easy to revisit, and ready to evolve into something bigger — without interrupting the creative flow.' },
    { title: 'Managers & Product Thinkers', description: 'Meetings start on paper and end with structure. Notes turn into clear summaries, tasks, and follow-ups. The pen captures everything quietly, while the app helps organize decisions without pulling attention away from the room.' },
  ],
  aboutArtwork: artwork('spec-profile', 'Silver NŌTA fountain pen', 'hero-desktop'),
  paperHeading: { title: 'Works with\nsmart paper' },
  paperDetails: [
    { title: 'We use special paper\nwith a nearly invisible\npattern', caption: 'For the pen, it’s a precise map', description: 'The pattern defines exact coordinates across the page, allowing the pen to capture every stroke with precision and consistency. For you, it feels like ordinary paper. For the system, it becomes a stable reference that turns handwriting into structured, accurate digital data.', ...artwork('paper-cover', 'Closed NŌTA SmartPaper notebook', 'paper-cover-mobile') },
    { title: 'Looks like paper.\nWorks like a system.', caption: 'For you, it’s just a blank sheet', description: 'You write freely, without grids, guides, or visible markers. The paper feels clean and familiar, keeping your focus on ideas instead of tools. Nothing distracts you from the act of writing. Nothing changes in how you write — only what becomes possible after.', ...artwork('paper-open', 'Open dark notebook', 'paper-open-mobile') },
    { title: 'No delays. No glitches.\nNo random effects.', caption: 'AI-powered structure', description: 'Handwriting is processed in real time and enriched quietly in the background. AI recognizes text, structure, and context to organize notes, highlight key ideas, and connect thoughts over time. The technology stays invisible, so your focus remains fully on writing.', ...artwork('paper-written', 'Open SmartPaper notebook with handwritten notes', 'paper-written-mobile') },
    { title: 'Everything you write is synced\nto your phone in real time', caption: 'Your notes. Already there.', description: 'Every note is instantly transferred to your device and safely stored in your personal space. Access your thoughts anytime, organize them effortlessly, and continue working across devices. Your handwriting becomes part of a system that is searchable, structured, and always available.', ...artwork('paper-synced', 'Handwritten notes synced to the NŌTA phone app', 'paper-synced-mobile') },
  ],
  boxHeading: { title: 'Inside\nthe box' },
  boxSet: { title: 'A complete, ready-to-use set', description: 'Smart pen, Smartpaper notepad, charging cable, and instructions — carefully packaged for a hassle-free start.', ...artwork('box-set', 'Smartpaper notebook and pen in the presentation box', 'box-set-mobile') },
  boxProductOverview: 'A precision smart pen with a solid aluminum body, designed for natural handwriting and accurate digital capture. Seamlessly connects to smart paper, translating every stroke into structured digital data — no screens, no distractions, just writing.',
  boxItems: [
    { title: 'The NŌTA Smart Pen', description: 'Aluminum body, USB-C charging, physical control button, and Bluetooth connectivity.\nUp to 8 hours of active use with a lightweight, balanced design for everyday writing.', ...artwork('box-pen', 'Silver smart pen nib and body', 'box-pen-mobile') },
    { title: 'Charging Adapter', description: 'Compact USB-C power adapter with stable output for everyday charging. Designed for safe, efficient power delivery with minimal heat.', ...artwork('box-adapter', 'USB-C cable attached to the charging adapter', 'box-adapter-mobile'), hoverImageUrl: '/images/box-adapter-alternate.webp' },
  ],
  boxCallouts: [
    { title: 'Flush-fit precision cap', ...artwork('detail-cap', 'Detail of the clipped pen cap') },
    { title: 'Refined colors. Personal expression', ...artwork('detail-finishes', 'Blue and silver pen finishes') },
    { title: '', ...artwork('detail-button', 'Detail of the physical control button') },
    { title: 'Durable metal nib, low-profile control button', ...artwork('detail-nib', 'Angled close-up of the metal nib and round control button') },
    { title: 'Aluminum body', ...artwork('detail-barrel', 'Close-up of the aluminum barrel') },
    { title: '', ...artwork('detail-machining', 'Close-up of the precision-machined control', 'detail-machining-mobile') },
  ],
  colorsHeading: { title: 'Pen finishes' },
  colors: [
    { title: 'Impossible to', description: 'overthink', ...artwork('silver', 'Polished silver pen'), tone: '#7d818d' },
    { title: 'Graphite Black.', description: 'Clarity in silence.', ...artwork('graphite', 'Graphite black pen'), tone: '#171a20' },
    { title: 'Mist Blue.', description: 'Light thinking.', ...artwork('mist-blue', 'Mist blue pen'), tone: '#53688c' },
    { title: 'Precision Red.', description: 'Form follows thought.', ...artwork('precision-red', 'Precision red pen'), tone: '#9a1026' },
    { title: 'Bright Orange.', description: 'Steady focus.', ...artwork('bright-orange', 'Bright orange pen'), tone: '#c57a51', darkText: true },
  ],
  footerDescription: 'NŌTA creates tools that respect the way people think and write. Natural handwriting, quietly connected to digital structure.',
  footerNavigationLabel: 'Navigation',
  footerLinks: navigation,
  footerYearLabel: 'Year',
  footerYear: '2026',
  footerCopyright: '©2026 Nōta Team',
  footerCredit: 'Designed by Alice\n& UPROCK Studio',
  footerProject: 'Independent Surge Global assignment',
  formCopy: {
    title: 'Stay ahead',
    description: 'Launching soon. Get early access and insider updates',
    nameLabel: 'Name',
    emailLabel: 'E-mail',
    messageLabel: 'Message',
    submitLabel: 'Notify me',
    closeLabel: 'Close',
    sendingLabel: 'Sending…',
    successMessage: 'Your inquiry was received. Thank you for your interest.',
    errorMessage: 'We couldn’t save your inquiry. Please try again.',
    retryMessage: 'Too many attempts. Please try again shortly.',
  },
  seo: {
    metaTitle: 'NŌTA — Smart pen for real thinking',
    metaDescription: 'NŌTA One connects natural handwriting with digital notes. A writing system for ideas in motion.',
    ogImageUrl: '/images/silver.webp',
  },
} satisfies Homepage;
