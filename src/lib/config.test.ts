import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/config";

describe("production configuration safety", () => {
  it("rejects live geocoding with the development signing secret", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "production",
        GEOCODING_API_URL: "https://geocoder.example.test/search",
      })
    ).toThrow(/PLACE_TOKEN_SECRET/);
  });

  it("accepts live geocoding with a unique sufficiently long signing secret", () => {
    const parsed = parseServerEnv({
      NODE_ENV: "production",
      GEOCODING_API_URL: "https://geocoder.example.test/search",
      PLACE_TOKEN_SECRET: "a-unique-production-secret-with-32-plus-characters",
    });
    expect(parsed.PLACE_TOKEN_SECRET).toHaveLength(50);
  });
});
