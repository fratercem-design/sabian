import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl text-gold/40" aria-hidden="true">360°</p>
        <h1 className="mt-4 font-display text-3xl font-medium text-parchment-100">
          This page is not in the wheel
        </h1>
        <p className="mt-4 leading-relaxed text-silver-moon">
          The page you&rsquo;re looking for doesn&rsquo;t exist, or your reading may have been deleted.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button href="/">Return Home</Button>
          <Button href="/reading/new" variant="ghost">Begin a Reading</Button>
        </div>
      </div>
    </main>
  );
}
