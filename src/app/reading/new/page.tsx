import type { Metadata } from "next";
import { TestingBadge } from "@/components/ui";
import ReadingForm from "./reading-form";

export const metadata: Metadata = {
  title: "Begin Your Reading",
};

export default function NewReadingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 md:py-20">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-parchment-100 md:text-4xl">
            Begin Your Reading
          </h1>
          <p className="mt-2 text-sm text-silver-moon">
            A few calm questions. Nothing is shared, nothing is required of you but a moment of
            attention.
          </p>
        </div>
        <TestingBadge />
      </div>
      <ReadingForm />
    </main>
  );
}
