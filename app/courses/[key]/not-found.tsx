import Link from "next/link";

export default function CourseNotFound() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-24 text-center">
      <p className="font-mono text-sm text-brand">404</p>
      <h1 className="text-2xl font-semibold">This page is not part of the course.</h1>
      <p className="text-muted">The course may have been removed, or the link is wrong.</p>
      <Link href="/" className="mx-auto w-fit rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink">
        Back to playground.
      </Link>
    </div>
  );
}
