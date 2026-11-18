import Experience from '@/components/Experience';
import { getHomepage } from '@/lib/strapi';
import { homepageData } from '@/content/homepage';
import type { Homepage } from '@/lib/strapi';

// Local-first preview. Set CONTENT_SOURCE=strapi after Strapi is ready.
// In Strapi mode the app never falls back to hardcoded content if the CMS is down.
export const dynamic = 'force-dynamic';

export default async function Home() {
  if (process.env.CONTENT_SOURCE !== 'strapi') {
    return <Experience data={homepageData as Homepage} />;
  }
  try {
    const data = await getHomepage();
    return <Experience data={data} />;
  } catch (error) {
    return <main className="setup-screen" role="alert">
      <div className="setup-wordmark">NŌTA</div>
      <p>CMS CONNECTION REQUIRED</p>
      <h1>One final connection.</h1>
      <p>Strapi is selected but its published homepage could not be loaded. Check STRAPI_URL and the content API, then refresh.</p>
      {process.env.NODE_ENV === 'development' && <code>{String(error)}</code>}
    </main>;
  }
}
