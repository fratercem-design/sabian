import { describe, expect, it } from "vitest";
import { signPlaceToken, verifyPlaceToken } from "@/lib/places/place-token";
import { resolvePlace } from "@/lib/places/resolve";
import type { PlaceResult } from "@/lib/types";

const LIVE_PLACE: PlaceResult = {
  id: "geo-2643743",
  displayName: "London",
  region: "England",
  country: "United Kingdom",
  latitude: 51.5072,
  longitude: -0.1276,
  timezone: "Europe/London",
};

describe("signed place tokens (secure live-geocoding resolution)", () => {
  it("round-trips a server-validated place", () => {
    const token = signPlaceToken(LIVE_PLACE);
    expect(token).toContain(".");
    const back = verifyPlaceToken(token);
    expect(back).toEqual(LIVE_PLACE);
  });

  it("rejects a tampered payload", () => {
    const token = signPlaceToken(LIVE_PLACE);
    const [body, sig] = token.split(".");
    // Flip a character in the payload body.
    const tamperedBody = body.slice(0, -1) + (body.endsWith("A") ? "B" : "A");
    expect(verifyPlaceToken(`${tamperedBody}.${sig}`)).toBeNull();
  });

  it("rejects a forged signature", () => {
    const token = signPlaceToken(LIVE_PLACE);
    const body = token.split(".")[0];
    expect(verifyPlaceToken(`${body}.AAAA`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const now = Date.now();
    const token = signPlaceToken(LIVE_PLACE, now);
    // 25 hours later — beyond the 24h TTL.
    expect(verifyPlaceToken(token, now + 25 * 60 * 60 * 1000)).toBeNull();
    // Just inside the TTL it still resolves.
    expect(verifyPlaceToken(token, now + 23 * 60 * 60 * 1000)).toEqual(LIVE_PLACE);
  });

  it("rejects malformed and empty input", () => {
    expect(verifyPlaceToken("")).toBeNull();
    expect(verifyPlaceToken("not-a-token")).toBeNull();
    expect(verifyPlaceToken("a.b.c")).toBeNull();
  });

  it("rejects a token whose place lacks security-critical fields", () => {
    const { timezone, ...noTz } = LIVE_PLACE;
    // Sign a place missing its timezone; verification must refuse it.
    const token = signPlaceToken(noTz as PlaceResult);
    expect(verifyPlaceToken(token)).toBeNull();
    void timezone;
  });
});

describe("resolvePlace — single resolution path", () => {
  it("resolves a local fixture id", async () => {
    const place = await resolvePlace("london-uk");
    expect(place).not.toBeNull();
    expect(place!.displayName).toBe("London");
  });

  it("resolves a signed live token", async () => {
    const token = signPlaceToken(LIVE_PLACE);
    const place = await resolvePlace(token);
    expect(place).toEqual(LIVE_PLACE);
  });

  it("returns null for an unknown id or forged token", async () => {
    expect(await resolvePlace("does-not-exist-999")).toBeNull();
    expect(await resolvePlace("forged.token")).toBeNull();
    expect(await resolvePlace("")).toBeNull();
  });

  it("never trusts a client-fabricated token body", async () => {
    const real = signPlaceToken(LIVE_PLACE);
    const body = real.split(".")[0];
    // Attacker keeps a valid signature but swaps in their own payload body.
    const forgedBody = Buffer.from(
      JSON.stringify({ place: { ...LIVE_PLACE, latitude: 0, timezone: "UTC" }, iat: Date.now() }),
      "utf8"
    ).toString("base64url");
    expect(await resolvePlace(`${forgedBody}.${real.split(".")[1]}`)).toBeNull();
    void body;
  });
});
