import type { PlaceResult, Reading, ReviewResult } from "./types";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://www.psychesymbols.xyz").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new ApiError(payload.error || "The reading service could not complete this request.", response.status);
  return payload;
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const payload = await request<{ results: PlaceResult[] }>(`/api/places?q=${encodeURIComponent(query)}&limit=6`);
  return payload.results;
}

export async function reviewBirthDetails(input: {
  date: string;
  time?: string;
  timeKnown: boolean;
  placeId: string;
}): Promise<ReviewResult> {
  return request<ReviewResult>("/api/reading/review", { method: "POST", body: JSON.stringify(input) });
}

export async function createReading(input: {
  displayName: string;
  birthDate: string;
  birthTime?: string;
  timeKnown: boolean;
  placeId: string;
}): Promise<Reading> {
  const payload = await request<{ reading: Reading }>("/api/readings", {
    method: "POST",
    body: JSON.stringify({ ...input, consent: true }),
  });
  return payload.reading;
}

export async function getReading(id: string): Promise<Reading> {
  const payload = await request<{ reading: Reading }>(`/api/readings/${encodeURIComponent(id)}`);
  return payload.reading;
}

export async function saveReading(id: string): Promise<boolean> {
  const payload = await request<{ saved: boolean }>(`/api/readings/${encodeURIComponent(id)}`, { method: "PATCH" });
  return payload.saved;
}

export async function deleteReading(id: string): Promise<boolean> {
  const payload = await request<{ deleted: boolean }>(`/api/readings/${encodeURIComponent(id)}`, { method: "DELETE" });
  return payload.deleted;
}
