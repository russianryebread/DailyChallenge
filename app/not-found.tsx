import Link from 'next/link';

export const metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <main className="app-shell">
      <section className="reading-screen placeholder-screen" aria-label="Not found">
        <div className="placeholder-body">
          <h1>This page isn’t here</h1>
          <p>The reading or page you followed doesn’t exist.</p>
          <Link className="text-link" href="/today">
            Go to today’s reading
          </Link>
        </div>
      </section>
    </main>
  );
}
