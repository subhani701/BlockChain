'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExplanationPopoverProps {
  title?: string;
  explanation: string;
  attributions?: string[];
  className?: string;
}

export function ExplanationPopover({ title = 'Why this score', explanation, attributions, className }: ExplanationPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        aria-expanded={open}
      >
        <HelpCircle size={12} />
        Why?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 p-3 rounded-lg border border-border bg-card shadow-lg text-left">
            <p className="text-xs font-semibold text-foreground mb-1">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
            {attributions && attributions.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {attributions.map((a) => (
                  <li key={a} className="text-[10px] font-mono text-muted-foreground">{a}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
