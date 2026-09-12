"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export interface PlaceOption {
  id: string;
  displayName: string;
  region?: string;
  country?: string;
  timezone: string;
}

/**
 * Birthplace search, implemented as a WAI-ARIA 1.2 combobox with a listbox
 * popup.
 *
 * Accessibility contract (WAI-ARIA Authoring Practices, "Combobox with List
 * Autocomplete"):
 *  - the text field carries role="combobox", aria-autocomplete="list",
 *    aria-expanded, aria-controls and aria-activedescendant
 *  - results are options in a named listbox and expose aria-selected
 *  - Arrow Down/Up, Home/End, Enter, Escape and Tab all work without a pointer
 *  - result count, loading, no-results and failure are announced politely and
 *    never move focus
 *
 * Privacy contract: no request is issued until the caller enables the field,
 * which happens only after the location-provider disclosure is acknowledged.
 * Only the free-text query is sent. A failed request keeps the typed text and
 * offers an explicit retry rather than silently emptying the field.
 */
interface PlaceComboboxProps {
  label?: string;
  /** Stable id for the text field, so an error summary can link to it. */
  id?: string;
  /** Disabled until the location-provider disclosure is acknowledged. */
  disabled?: boolean;
  selected: PlaceOption | null;
  onSelect: (place: PlaceOption | null) => void;
  /** Ids of elements that describe the field (disclosure copy, hints). */
  describedBy?: string;
}

type SearchState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "results"; results: PlaceOption[] }
  | { kind: "empty" }
  | { kind: "failed" };

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

const FIELD_CLASS =
  "w-full min-h-[44px] rounded-lg border border-gold/25 bg-midnight-900 px-4 py-3 " +
  "text-parchment-100 placeholder:text-silver-mist focus:border-gold focus:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function PlaceCombobox({
  label = "Birthplace",
  id,
  disabled = false,
  selected,
  onSelect,
  describedBy,
}: PlaceComboboxProps) {
  const reactId = useId();
  const inputId = id ?? `place-${reactId}`;
  const listboxId = `${inputId}-listbox`;
  const optionId = (index: number) => `${inputId}-option-${index}`;

  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** Bumped by Retry so the effect re-issues the same query. */
  const [retryNonce, setRetryNonce] = useState(0);

  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = state.kind === "results" ? state.results : [];
  const selectedDisplayName = selected?.displayName ?? null;

  useEffect(() => {
    if (disabled) return;
    const trimmed = query.trim();
    // Too short to search. The reset for this case happens in the change
    // handler, so the effect body never calls setState synchronously.
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    // A committed selection puts its own display name in the field; do not
    // immediately search for the thing the user just chose.
    if (selectedDisplayName === trimmed) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ kind: "searching" });
      fetch(`/api/places?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Place search failed with status ${res.status}`);
          return (await res.json()) as { results?: PlaceOption[] };
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          const found = data.results ?? [];
          if (found.length === 0) {
            setState({ kind: "empty" });
            setOpen(false);
            setActiveIndex(-1);
            return;
          }
          setState({ kind: "results", results: found });
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          // The typed text is deliberately preserved.
          setState({ kind: "failed" });
          setOpen(false);
          setActiveIndex(-1);
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, disabled, selectedDisplayName, retryNonce]);

  // Keep the active option visible without moving focus off the input.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const commit = useCallback(
    (place: PlaceOption) => {
      onSelect(place);
      setQuery(place.displayName);
      setState({ kind: "idle" });
      setOpen(false);
      setActiveIndex(-1);
    },
    [onSelect]
  );

  const retry = () => {
    setState({ kind: "idle" });
    setRetryNonce((n) => n + 1);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const last = results.length - 1;

    if (event.key === "ArrowDown") {
      if (!results.length) return;
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((i) => (i >= last ? 0 : i + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      if (!results.length) return;
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(last);
        return;
      }
      setActiveIndex((i) => (i <= 0 ? last : i - 1));
      return;
    }
    if (event.key === "Home" && open && results.length) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open && results.length) {
      event.preventDefault();
      setActiveIndex(last);
      return;
    }
    if (event.key === "Enter") {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        commit(results[activeIndex]);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (open) {
        setOpen(false);
        setActiveIndex(-1);
        return;
      }
      setQuery("");
      onSelect(null);
      setState({ kind: "idle" });
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const announcement =
    state.kind === "searching"
      ? "Searching for places."
      : state.kind === "results"
        ? `${results.length} ${results.length === 1 ? "place" : "places"} found. ` +
          "Use the up and down arrow keys to review them, then Enter to choose."
        : state.kind === "empty"
          ? "No matching places. Try a city name, or add a country."
          : state.kind === "failed"
            ? "Place search could not be reached. Your text has been kept — choose Retry to search again."
            : selected
              ? `Selected ${selected.displayName}.`
              : "";

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gold-300">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        disabled={disabled}
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (selected) onSelect(null);
          if (value.trim().length < MIN_QUERY_LENGTH) {
            setState({ kind: "idle" });
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        onKeyDown={onKeyDown}
        placeholder="City and country, e.g. London, England"
        className={`${FIELD_CLASS} mt-2`}
      />

      {/* Polite status: never steals focus. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={`${label} search results`}
        hidden={disabled || !open || results.length === 0}
        className="mt-3 max-h-72 space-y-2 overflow-y-auto"
      >
        {results.map((place, index) => {
          const isSelected = selected?.id === place.id;
          const isActive = index === activeIndex;
          return (
            <li
              key={place.id}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              onMouseDown={(event) => {
                // Keep focus on the input so the combobox keeps its context.
                event.preventDefault();
                commit(place);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
                isActive || isSelected
                  ? "border-gold bg-gold/10"
                  : "border-gold/20 bg-midnight-900 hover:border-gold/50"
              }`}
            >
              <span className="block font-medium text-parchment-100">
                {place.displayName}
                {isSelected && <span className="ml-2 text-xs text-gold-300">· Selected</span>}
              </span>
              <span className="block text-[13px] text-silver-moon">
                {[place.region, place.country].filter(Boolean).join(", ")} · {place.timezone}
              </span>
            </li>
          );
        })}
      </ul>

      {state.kind === "searching" && (
        <p className="mt-3 text-[13px] text-silver-moon">Searching…</p>
      )}

      {state.kind === "empty" && (
        <p className="mt-3 text-[13px] text-silver-moon">
          No matching places. Try a city name, or add a country — for example
          &ldquo;London, England&rdquo; or &ldquo;London, Ontario&rdquo;.
        </p>
      )}

      {state.kind === "failed" && (
        <div className="mt-3 rounded-xl border border-ember/50 bg-ember/10 p-4">
          <p className="text-[13px] text-parchment-200">
            The place search could not be reached. What you typed has been kept.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full border border-gold/50 px-5 py-2 text-sm font-medium text-gold-300 transition hover:bg-gold/10"
          >
            Retry search
          </button>
        </div>
      )}

      {selected && (
        <p className="mt-4 rounded-xl border border-gold/25 bg-midnight-900/60 px-4 py-3 text-[13px] text-parchment-200">
          <span className="font-medium text-gold-300">Selected:</span>{" "}
          {selected.displayName}
          {[selected.region, selected.country].filter(Boolean).length > 0 && (
            <>, {[selected.region, selected.country].filter(Boolean).join(", ")}</>
          )}
          <span className="block text-silver-moon">Time zone {selected.timezone}</span>
        </p>
      )}
    </div>
  );
}
