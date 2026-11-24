import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'mirrorbox — case records',
  description:
    'An intentionally vulnerable records vault for practising the same read IDOR under four id formats at once (CWE-639).',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted-foreground">
          mirrorbox is an intentionally vulnerable lab — run it locally, never expose it.
        </footer>
      </body>
    </html>
  );
}
