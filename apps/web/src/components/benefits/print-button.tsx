'use client';

import { Download } from 'lucide-react';

/** "Download PDF": opens the browser's print dialog (Save as PDF); the work-record print CSS does the rest. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print group inline-flex h-12 items-center gap-2 bg-hivis px-5 text-ink transition-colors hover:bg-ink hover:text-paper"
    >
      <Download className="size-4" aria-hidden />
      <span className="font-display text-[17px] font-bold tracking-tight">Download PDF</span>
    </button>
  );
}
