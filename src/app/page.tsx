import Experience from '@/components/Experience';
import { getHomepage } from '@/lib/homepage-server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  try {
    return <Experience data={await getHomepage()} />;
  } catch (error) {
    return <main className="setup-screen" role="alert">
      <h1>Homepage temporarily unavailable</h1>
      <p>Please try again shortly.</p>
      {process.env.NODE_ENV === 'development' && <code>{String(error)}</code>}
    </main>;
  }
}
