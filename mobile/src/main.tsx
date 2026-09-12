import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Network } from "@capacitor/network";
import { Share } from "@capacitor/share";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  API_BASE,
  ApiError,
  createReading,
  deleteReading,
  getReading,
  reviewBirthDetails,
  saveReading,
  searchPlaces,
} from "./api";
import type { PlaceResult, Reading, ReviewResult } from "./types";
import "./styles.css";

const STEPS = ["Name", "Date", "Time", "Place", "Review"] as const;
const LAST_READING_KEY = "psyche-symbols:last-saved-reading";
const isNative = Capacitor.isNativePlatform();

function pulse() {
  if (isNative) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

function formatPlacement(reading: Reading, key: string) {
  const placement = reading.chart.placements.find((item) => item.key === key);
  if (!placement) return null;
  return `${placement.sign} ${placement.degree}°${String(placement.minute).padStart(2, "0")}′ · Psyche ${placement.sabianDegree}`;
}

function AppMark({ small = false }: { small?: boolean }) {
  return (
    <svg className={small ? "mark mark--small" : "mark"} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="51" fill="none" stroke="currentColor" strokeWidth="1" opacity=".45" />
      <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="60" cy="60" r="19" fill="none" stroke="currentColor" strokeWidth="1" opacity=".7" />
      <circle cx="60" cy="60" r="5.5" className="mark__signal" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
        return <circle key={index} cx={60 + Math.cos(angle) * 51} cy={60 + Math.sin(angle) * 51} r="1.8" fill="currentColor" />;
      })}
    </svg>
  );
}

function Button({ children, kind = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "quiet" | "danger" }) {
  return (
    <button className={`button button--${kind}`} {...props}>
      {children}
    </button>
  );
}

function Shell({ children, online }: { children: React.ReactNode; online: boolean }) {
  return (
    <div className="app-shell">
      {!online && <div className="offline-banner" role="status">Offline · your details have not been sent</div>}
      <header className="app-header">
        <div className="wordmark"><AppMark small /><span>The Psyche Symbols</span></div>
        <span className="original-badge">Original 360</span>
      </header>
      {children}
    </div>
  );
}

function Home({ onBegin, onResume, hasSaved, online }: { onBegin: () => void; onResume: () => void; hasSaved: boolean; online: boolean }) {
  const openLink = async (path: string) => {
    const url = `${API_BASE}${path}`;
    if (isNative) await Browser.open({ url });
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="home">
      <section className="hero">
        <div className="hero__halo"><AppMark /></div>
        <p className="eyebrow">A CULT OF PSYCHE WORK</p>
        <h1>Open a mirror<br />in every degree.</h1>
        <p className="hero__lead">Your chart locates the degree. The Psyche Symbol opens the question.</p>
        <p className="hero__body">A private reading through 360 original images of signal, shadow, and sovereignty. Nothing here predicts your fate.</p>
        <div className="home__actions">
          <Button onClick={() => { pulse(); onBegin(); }} disabled={!online}>Open Your Mirrors</Button>
          {hasSaved && <Button kind="quiet" onClick={onResume} disabled={!online}>Return to saved reading</Button>}
        </div>
        <ul className="trust-list" aria-label="Privacy summary">
          <li>No account</li><li>Delete anytime</li><li>Unknown birth time welcome</li>
        </ul>
      </section>
      <section className="home__explain">
        <p className="eyebrow">SIGNAL BEFORE STORY</p>
        <h2>A symbol is a mirror, not a verdict.</h2>
        <p>Deterministic astronomy finds the exact degree. Original Psyche Symbols offer a picture to contemplate. You decide what resonates.</p>
      </section>
      <footer className="app-footer">
        <button onClick={() => void openLink("/about/method")}>Method</button>
        <button onClick={() => void openLink("/privacy")}>Privacy</button>
        <span>Reflection and entertainment, not professional advice.</span>
      </footer>
    </main>
  );
}

function ReadingForm({ onCancel, onCreated, online }: { onCancel: () => void; onCreated: (reading: Reading) => void; online: boolean }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [timeKnown, setTimeKnown] = useState<boolean | null>(null);
  const [time, setTime] = useState("");
  const [placeConsent, setPlaceConsent] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [storageConsent, setStorageConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  useEffect(() => {
    if (!placeConsent || placeQuery.trim().length < 2 || place?.displayName === placeQuery) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchPlaces(placeQuery.trim());
        if (!controller.signal.aborted) setPlaces(found);
      } catch {
        if (!controller.signal.aborted) setError("Place search is unavailable. Check your connection and try again.");
      }
    }, 320);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [placeConsent, placeQuery, place]);

  const titles = [
    "What should this reading call you?",
    "When did your story begin?",
    "How exact is the recorded time?",
    "Where did the sky meet the horizon?",
    "Review the signal before it opens.",
  ];

  const validateStep = () => {
    if (step === 0 && !name.trim()) return "Enter a name or nickname for the reading.";
    if (step === 1 && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Enter a complete birth date.";
    if (step === 2 && timeKnown === null) return "Choose whether your birth time is known.";
    if (step === 2 && timeKnown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "Enter the recorded birth time.";
    if (step === 3 && !placeConsent) return "Confirm the place-search disclosure first.";
    if (step === 3 && !place) return "Choose a birthplace from the search results.";
    return "";
  };

  const next = async () => {
    setError("");
    const problem = validateStep();
    if (problem) { setError(problem); return; }
    if (step < 3) { pulse(); setStep(step + 1); return; }
    if (step === 3 && place && timeKnown !== null) {
      setBusy(true);
      try {
        const result = await reviewBirthDetails({ date, time: timeKnown ? time : undefined, timeKnown, placeId: place.id });
        setReview(result);
        pulse();
        setStep(4);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "These details could not be reviewed.");
      } finally {
        setBusy(false);
      }
    }
  };

  const generate = async () => {
    if (!storageConsent || !place || timeKnown === null) {
      setError("Confirm that the app may create and temporarily store this reading.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const reading = await createReading({
        displayName: name.trim(), birthDate: date, birthTime: timeKnown ? time : undefined, timeKnown, placeId: place.id,
      });
      pulse();
      onCreated(reading);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The reading could not be created.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="reading-flow">
      <nav className="stepper" aria-label="Reading progress">
        <span>{step + 1} / {STEPS.length}</span>
        <ol>{STEPS.map((label, index) => <li key={label} className={index <= step ? "is-active" : ""} aria-current={index === step ? "step" : undefined}><span>{index + 1}</span><em>{label}</em></li>)}</ol>
      </nav>
      <section className="form-card">
        <p className="eyebrow">CALIBRATION {String(step + 1).padStart(2, "0")}</p>
        <h1 ref={headingRef} tabIndex={-1}>{titles[step]}</h1>
        {error && <div className="error" role="alert">{error}</div>}

        {step === 0 && <label className="field"><span>Name or nickname</span><input autoComplete="name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="The name this reading should use" /></label>}
        {step === 1 && <label className="field"><span>Birth date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>}
        {step === 2 && <fieldset className="choice-group"><legend>Birth time certainty</legend><label className={timeKnown === true ? "choice is-selected" : "choice"}><input type="radio" name="time-known" checked={timeKnown === true} onChange={() => setTimeKnown(true)} /><span><strong>I know my birth time</strong><small>Use the recorded hour and minute.</small></span></label><label className={timeKnown === false ? "choice is-selected" : "choice"}><input type="radio" name="time-known" checked={timeKnown === false} onChange={() => { setTimeKnown(false); setTime(""); }} /><span><strong>I don’t know it</strong><small>Angles and houses will be omitted rather than invented.</small></span></label>{timeKnown === true && <label className="field"><span>Recorded time</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>}</fieldset>}
        {step === 3 && <div className="place-step"><div className="disclosure"><strong>Before you search</strong><p>Your place query is sent to the Psyche Symbols location service to resolve timezone and coordinates. It is not used for advertising.</p><label><input type="checkbox" checked={placeConsent} onChange={(event) => { setPlaceConsent(event.target.checked); if (!event.target.checked) setPlaces([]); }} /> I understand and want to search.</label></div><label className="field"><span>Birthplace</span><input role="combobox" aria-autocomplete="list" aria-expanded={places.length > 0} aria-controls="place-results" disabled={!placeConsent} value={placeQuery} onChange={(event) => { setPlaceQuery(event.target.value); setPlace(null); setPlaces([]); }} placeholder="City and country" /></label>{places.length > 0 && <ul className="place-results" id="place-results" role="listbox">{places.map((item) => <li key={item.id} role="option" aria-selected={place?.id === item.id}><button type="button" onClick={() => { setPlace(item); setPlaceQuery(item.displayName); setPlaces([]); pulse(); }}><strong>{item.displayName}</strong><span>{[item.region, item.country].filter(Boolean).join(", ")} · {item.timezone}</span></button></li>)}</ul>}{place && <p className="selected-place">Selected · {place.displayName}, {place.country}</p>}</div>}
        {step === 4 && review && <div className="review"><dl><div><dt>Name</dt><dd>{name.trim()}</dd></div><div><dt>Date</dt><dd>{date}</dd></div><div><dt>Time</dt><dd>{timeKnown ? time : "Unknown — no assumed time"}</dd></div><div><dt>Place</dt><dd>{review.place.displayName}, {review.place.country}</dd></div><div><dt>Timezone</dt><dd>{review.place.timezone} · {review.offsetLabel}</dd></div></dl><details><summary>Technical details</summary><p>Coordinates: {review.place.latitude}, {review.place.longitude}</p><p>{review.utcIso ? `UTC instant: ${review.utcIso}` : `Reference instant only: ${review.referenceUtcIso}`}</p></details><label className="consent"><input type="checkbox" checked={storageConsent} onChange={(event) => setStorageConsent(event.target.checked)} /><span>I consent to creating this reading. It is private, can be deleted from the result, and follows the retention described in the privacy policy.</span></label></div>}

        <div className="form-actions">
          <Button kind="quiet" onClick={step === 0 ? onCancel : () => { setError(""); setStep(step - 1); }} disabled={busy}>{step === 0 ? "Cancel" : "Back"}</Button>
          {step < 4 ? <Button onClick={() => void next()} disabled={busy || !online}>{busy ? "Resolving…" : "Continue"}</Button> : <Button onClick={() => void generate()} disabled={busy || !online}>{busy ? "Opening the mirrors…" : "Create My Reading"}</Button>}
        </div>
      </section>
    </main>
  );
}

function LensCard({ label, lens }: { label: string; lens: { title: string; placement: string; symbol: string; interpretation: string; light: string; shadow: string; reflectionQuestion: string } }) {
  return <article className="lens-card"><p className="eyebrow">{label}</p><h3>{lens.title}</h3><p className="placement">{lens.placement}</p><blockquote>{lens.symbol}</blockquote><p>{lens.interpretation}</p><div className="lens-grid"><p><strong>Signal</strong>{lens.light}</p><p><strong>Shadow</strong>{lens.shadow}</p></div><p className="mirror"><strong>Mirror</strong>{lens.reflectionQuestion}</p></article>;
}

function Result({ reading, onHome, onReadingChange }: { reading: Reading; onHome: () => void; onReadingChange: (reading: Reading | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const interpretation = reading.interpretation;

  const save = async () => {
    setBusy(true); setNotice("");
    try {
      if (await saveReading(reading.id)) {
        localStorage.setItem(LAST_READING_KEY, reading.id);
        onReadingChange({ ...reading, saved: true });
        setNotice("Saved. This device remembers only the private reading identifier.");
        pulse();
      }
    } catch (caught) { setNotice(caught instanceof Error ? caught.message : "Could not save the reading."); }
    finally { setBusy(false); }
  };

  const share = async () => {
    const url = `${API_BASE}/reading/${reading.id}`;
    const text = "A private Psyche Symbols reading. Anyone with this link can view it until it is deleted.";
    try {
      if (isNative) await Share.share({ title: `${reading.displayName}’s Psyche Symbols`, text, url, dialogTitle: "Share private reading link" });
      else if (navigator.share) await navigator.share({ title: `${reading.displayName}’s Psyche Symbols`, text, url });
      else { await navigator.clipboard.writeText(url); setNotice("Private link copied."); }
    } catch { /* User cancellation is not an error state. */ }
  };

  const remove = async () => {
    if (!window.confirm("Delete this reading and its stored birth data? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteReading(reading.id);
      localStorage.removeItem(LAST_READING_KEY);
      onReadingChange(null);
      onHome();
    } catch (caught) { setNotice(caught instanceof Error ? caught.message : "Could not delete the reading."); setBusy(false); }
  };

  if (!interpretation) return <main className="result"><h1>The reading is still forming.</h1><p>{reading.error || "Return in a moment."}</p><Button onClick={onHome}>Home</Button></main>;

  return (
    <main className="result">
      <button className="text-button" onClick={onHome}>← Home</button>
      <header className="result__hero"><AppMark /><p className="eyebrow">YOUR PSYCHE SYMBOLS</p><h1>{reading.displayName}</h1><p>{interpretation.summary}</p><div className="themes">{interpretation.coreThemes.map((theme) => <span key={theme}>{theme}</span>)}</div>{!reading.timeKnown && <div className="uncertainty" role="note">Birth time unknown · angles and houses are omitted, never invented.</div>}</header>
      <section className="placement-strip" aria-label="Principal placements"><p><strong>Sun</strong>{formatPlacement(reading, "sun")}</p><p><strong>Moon</strong>{formatPlacement(reading, "moon")}</p>{reading.timeKnown && <p><strong>Ascendant</strong>{formatPlacement(reading, "ascendant")}</p>}</section>
      <section className="lenses"><h2>The three gates</h2><LensCard label="SUN · THE VISIBLE SIGNAL" lens={interpretation.sun} /><LensCard label="MOON · THE INNER CHAMBER" lens={interpretation.moon} />{interpretation.ascendant.available && <LensCard label="ASCENDANT · THE THRESHOLD" lens={interpretation.ascendant} />}</section>
      <section className="chapters"><p className="eyebrow">THE CONSTELLATION</p><h2>Your story in seven movements</h2>{interpretation.story.map((chapter, index) => <article key={chapter.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{chapter.title}</h3>{chapter.body.split(/\n+/).map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div></article>)}</section>
      <section className="practice"><h2>Carry the mirror with you</h2><h3>Journal</h3><ol>{interpretation.journalPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ol><h3>Grounding practice</h3><p>{interpretation.groundingExercise}</p><blockquote>{interpretation.affirmation}</blockquote></section>
      <section className="result-actions"><h2>Your reading remains yours.</h2><p>Saving retains it according to the privacy policy. Sharing exposes the private link to anyone you choose. Deleting removes it.</p>{notice && <p role="status" className="notice">{notice}</p>}<div>{!reading.saved && <Button onClick={() => void save()} disabled={busy}>Save reading</Button>}<Button kind="quiet" onClick={() => void share()}>Share private link</Button><Button kind="danger" onClick={() => void remove()} disabled={busy}>Delete reading</Button></div></section>
      <p className="disclaimer">{interpretation.safetyDisclaimer}</p>
    </main>
  );
}

function PsycheApp() {
  const [view, setView] = useState<"home" | "form" | "result">("home");
  const [reading, setReading] = useState<Reading | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [resumeBusy, setResumeBusy] = useState(false);
  const savedId = localStorage.getItem(LAST_READING_KEY);

  const openSaved = async () => {
    const id = localStorage.getItem(LAST_READING_KEY);
    if (!id) return;
    setResumeBusy(true);
    try { setReading(await getReading(id)); setView("result"); }
    catch { localStorage.removeItem(LAST_READING_KEY); }
    finally { setResumeBusy(false); }
  };

  useEffect(() => {
    let disposed = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];
    if (!isNative) {
      const update = () => setOnline(navigator.onLine);
      window.addEventListener("online", update); window.addEventListener("offline", update);
      return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
    }
    void (async () => {
      await StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
      if (Capacitor.getPlatform() === "android") await StatusBar.setBackgroundColor({ color: "#0B1020" }).catch(() => undefined);
      await SplashScreen.hide().catch(() => undefined);
      const status = await Network.getStatus(); if (!disposed) setOnline(status.connected);
      handles.push(await Network.addListener("networkStatusChange", (next) => setOnline(next.connected)));
      handles.push(await NativeApp.addListener("backButton", () => {
        if (view === "result" || view === "form") setView("home");
        else void NativeApp.exitApp();
      }));
      handles.push(await NativeApp.addListener("appUrlOpen", async ({ url }) => {
        try {
          const parsed = new URL(url);
          const match = parsed.pathname.match(/^\/reading\/([^/]+)$/);
          if (match?.[1]) { setReading(await getReading(match[1])); setView("result"); }
        } catch { /* Ignore malformed or unsupported deep links. */ }
      }));
    })();
    return () => { disposed = true; for (const handle of handles) void handle.remove(); };
  }, [view]);

  return (
    <Shell online={online}>
      {view === "home" && <Home online={online} hasSaved={Boolean(savedId) && !resumeBusy} onResume={() => void openSaved()} onBegin={() => setView("form")} />}
      {view === "form" && <ReadingForm online={online} onCancel={() => setView("home")} onCreated={(next) => { setReading(next); setView("result"); }} />}
      {view === "result" && reading && <Result reading={reading} onHome={() => setView("home")} onReadingChange={setReading} />}
    </Shell>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><PsycheApp /></React.StrictMode>);
