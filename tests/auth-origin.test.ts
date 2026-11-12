import { describe, expect, it } from "vitest";
import { canonicalOrigin } from "@/lib/auth/google";

describe("canonicalOrigin", () => {
  const production = { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "playground-portal-bay.vercel.app" } as unknown as NodeJS.ProcessEnv;
  it("uses the production domain on Vercel production, whatever address was used", () => {
    expect(canonicalOrigin("https://playground-portal-1kttt1a42-vlad-andres-projects.vercel.app/api/auth/google", production)).toBe("https://playground-portal-bay.vercel.app");
  });
  it("uses the request's own address elsewhere", () => {
    expect(canonicalOrigin("http://localhost:3100/api/auth/google", {} as NodeJS.ProcessEnv)).toBe("http://localhost:3100");
    expect(canonicalOrigin("https://preview.vercel.app/x", { VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "playground-portal-bay.vercel.app" } as unknown as NodeJS.ProcessEnv)).toBe("https://preview.vercel.app");
  });
});
