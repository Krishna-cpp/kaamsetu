import Link from 'next/link';

export default function WorkerNotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 pt-14">
      <div className="w-full max-w-md border-2 border-dashed border-ink bg-paper">
        <div className="hazard h-10 border-b-2 border-ink opacity-40" aria-hidden />
        <div className="p-7">
          <p className="label text-concrete">Worker ID · not found</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[0.95] tracking-tight">
            This card isn&rsquo;t <span className="serif-i font-normal">on the board.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-concrete-dark">
            The link may be mistyped, or the worker removed their profile. Workers can delete their data at any time.
          </p>
          <div className="mt-6 flex gap-2">
            <Link href="/hire" className="label inline-flex h-11 flex-1 items-center justify-center bg-ink text-paper hover:bg-hivis hover:text-ink">
              Find workers
            </Link>
            <Link href="/" className="label inline-flex h-11 flex-1 items-center justify-center border border-ink hover:bg-paper-2">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
