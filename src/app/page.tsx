'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, FileText, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, type Dossier } from '@/lib/client';

// The four public names for the SAME dossier. Each one is a real, working
// request path — paste any of them into a proxy and GET it.
function formats(d: Dossier): { label: string; path: string; value: string }[] {
  return [
    { label: 'sequential', path: `/api/dossiers/by-id/${d.id}`, value: String(d.id) },
    { label: 'uuid', path: `/api/dossiers/by-uuid/${d.uuid}`, value: d.uuid },
    { label: 'base64 handle', path: `/api/dossiers/by-handle/${d.handle}`, value: d.handle },
    { label: 'hashids code', path: `/api/dossiers/by-code/${d.code}`, value: d.code },
  ];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-primary"
      aria-label="Copy"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function DossierCard({ dossier }: { dossier: Dossier }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-serif">
            <FileText className="size-4 text-primary" />
            {dossier.title}
          </CardTitle>
          {dossier.classification === 'confidential' ? (
            <span className="stamp">
              <Lock className="size-3" /> Confidential
            </span>
          ) : (
            <Badge variant="outline">internal</Badge>
          )}
        </div>
        <CardDescription>{dossier.body}</CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-2 border-t border-dashed pt-3">
        <p className="format-tab text-muted-foreground">Same dossier, four public names</p>
        {formats(dossier).map((f) => (
          <div key={f.label} className="flex items-center gap-2 text-xs">
            <span className="format-tab w-28 shrink-0 text-accent">{f.label}</span>
            <code className="flex-1 truncate rounded bg-muted px-2 py-1 font-mono">{f.path}</code>
            <CopyButton text={f.path} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [dossiers, setDossiers] = useState<Dossier[] | null>(null);

  useEffect(() => {
    api<{ dossiers: Dossier[] }>('/api/dossiers').then((res) => {
      if (!res.ok) {
        router.push('/login');
        return;
      }
      setDossiers(res.data.dossiers);
    });
  }, [router]);

  if (!dossiers) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl">Your case board</h1>
        <p className="text-sm text-muted-foreground">
          Every format below is a real, working request for the exact same dossier — sequential id,
          UUID, base64 handle and hashids code all point at one row. Try requesting the same four
          shapes of path for a dossier number that is <em>not</em> on this board.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {dossiers.map((d) => (
          <DossierCard key={d.id} dossier={d} />
        ))}
      </div>
    </div>
  );
}
