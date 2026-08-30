import { afterEach, describe, expect, it, vi } from "vitest";
import { isReadinessRouteAllowed } from "@/app/dev/readiness/gate";

describe("readiness dashboard access gate (fail-closed)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies production even if the flag is enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("READINESS_DASHBOARD_ENABLED", "true");
    expect(isReadinessRouteAllowed()).toBe(false);
  });

  it("denies production when the flag is absent", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("READINESS_DASHBOARD_ENABLED", "");
    expect(isReadinessRouteAllowed()).toBe(false);
  });

  it("denies development by default (flag off)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("READINESS_DASHBOARD_ENABLED", "");
    expect(isReadinessRouteAllowed()).toBe(false);
    vi.stubEnv("READINESS_DASHBOARD_ENABLED", "false");
    expect(isReadinessRouteAllowed()).toBe(false);
  });

  it("allows development only when explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("READINESS_DASHBOARD_ENABLED", "true");
    expect(isReadinessRouteAllowed()).toBe(true);
    vi.stubEnv("READINESS_DASHBOARD_ENABLED", "1");
    expect(isReadinessRouteAllowed()).toBe(true);
  });

  it("denies the test environment unless explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("READINESS_DASHBOARD_ENABLED", "");
    expect(isReadinessRouteAllowed()).toBe(false);
    vi.stubEnv("READINESS_DASHBOARD_ENABLED", "true");
    expect(isReadinessRouteAllowed()).toBe(true);
  });
});
