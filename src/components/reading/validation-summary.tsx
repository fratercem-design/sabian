"use client";

import { forwardRef } from "react";

export interface ValidationIssue {
  /** id of the field the message belongs to, for the in-page link. */
  fieldId?: string;
  message: string;
}

/**
 * Error summary for the intake form.
 *
 * Receives focus only after a failed submission (the caller focuses the
 * forwarded ref), links each message to the field it belongs to, and is
 * announced as an alert.
 */
export const ValidationSummary = forwardRef<HTMLDivElement, { issues: ValidationIssue[] }>(
  function ValidationSummary({ issues }, ref) {
    if (issues.length === 0) return null;
    return (
      <div
        ref={ref}
        tabIndex={-1}
        role="alert"
        aria-labelledby="validation-summary-heading"
        className="mb-6 rounded-xl border border-ember/60 bg-ember/10 p-4 focus-visible:outline-gold"
      >
        <h2 id="validation-summary-heading" className="text-sm font-semibold text-ember">
          {issues.length === 1 ? "Please check one thing:" : `Please check ${issues.length} things:`}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-parchment-200">
          {issues.map((issue) => (
            <li key={issue.message}>
              {issue.fieldId ? (
                <a
                  href={`#${issue.fieldId}`}
                  className="underline decoration-ember/60 underline-offset-4 hover:text-parchment-100"
                  onClick={(event) => {
                    event.preventDefault();
                    const el = document.getElementById(issue.fieldId!);
                    el?.focus();
                    el?.scrollIntoView({ block: "center", behavior: "smooth" });
                  }}
                >
                  {issue.message}
                </a>
              ) : (
                issue.message
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
);
