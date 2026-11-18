import Experience from '@/components/Experience';
import { getHomepage } from '@/lib/homepage-server';

export const dynamic = 'force-dynamic';

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export default async function Home() {
  try {
    const homepage = await getHomepage();
    const { structuredData } = homepage.seo;
    const hasJsonLd = Array.isArray(structuredData)
      ? structuredData.length > 0 && structuredData.every(isJsonObject)
      : isJsonObject(structuredData);
    const jsonLd = hasJsonLd ? JSON.stringify(structuredData).replace(/</g, '\\u003c') : undefined;
    return <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
      <Experience data={homepage} />
    </>;
  } catch (error) {
    return <main className="setup-screen" role="alert">
      <h1>Homepage temporarily unavailable</h1>
      <p>Please try again shortly.</p>
      {process.env.NODE_ENV === 'development' && <code>{String(error)}</code>}
    </main>;
  }
}
