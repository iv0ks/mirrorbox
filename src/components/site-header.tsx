'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FolderLock, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, type Me } from '@/lib/client';

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let live = true;
    api<{ user: Me }>('/api/me').then((res) => {
      if (live) setMe(res.ok ? res.data.user : null);
    });
    return () => {
      live = false;
    };
  }, [pathname]);

  async function logout() {
    await api('/api/logout', { method: 'POST' });
    setMe(null);
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-10 border-b-2 border-double bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-md border-2 border-primary/60 bg-primary/10 text-primary">
            <FolderLock className="size-4" />
          </span>
          <span className="font-serif">
            mirror<span className="text-primary">box</span>
          </span>
        </Link>
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          Case Records Division
        </p>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {me ? (
            <>
              <span className="text-muted-foreground">
                investigator: <span className="text-foreground">{me.username}</span>
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut /> Sign out
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">
                <LogIn /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
