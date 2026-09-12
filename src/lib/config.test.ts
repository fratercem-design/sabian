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

  it("accepts Vercel Blob OIDC credentials as a complete pair", () => {
    const parsed = parseServerEnv({
      NODE_ENV: "production",
      IMAGE_PROVIDER: "openai",
      IMAGE_API_KEY: "test-image-key",
      IMAGE_ASSET_STORAGE: "vercel-blob",
      VERCEL_OIDC_TOKEN: "test-oidc-token",
      BLOB_STORE_ID: "store_test",
    });
    expect(parsed.BLOB_STORE_ID).toBe("store_test");
  });

  it("rejects Blob OIDC authentication without a store id", () => {
    expect(() =>
      parseServerEnv({
        NODE_ENV: "production",
        IMAGE_PROVIDER: "openai",
        IMAGE_API_KEY: "test-image-key",
        IMAGE_ASSET_STORAGE: "vercel-blob",
        VERCEL_OIDC_TOKEN: "test-oidc-token",
      })
    ).toThrow(/BLOB_STORE_ID/);
  });

  it("continues to accept a legacy Blob read-write token", () => {
    const parsed = parseServerEnv({
      NODE_ENV: "production",
      IMAGE_PROVIDER: "openai",
      IMAGE_API_KEY: "test-image-key",
      IMAGE_ASSET_STORAGE: "vercel-blob",
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
    });
    expect(parsed.BLOB_READ_WRITE_TOKEN).toBe("vercel_blob_rw_test");
  });
});
