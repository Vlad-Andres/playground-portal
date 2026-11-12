import { sealData } from "iron-session";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => undefined, updateTag: () => undefined }));
vi.mock("next/navigation", () => ({ redirect: () => undefined, notFound: () => undefined }));

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) as string } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
  }),
}));

import { adminConfigured, ADMIN_COOKIE, requireAdmin, sessionPassword, tokenMatches } from "@/lib/admin/session";
import { createCode, deleteCode, deleteCourse, login, logout, saveSettings, saveTranslations, setCodeActive } from "@/app/admin/actions";

const TOKEN = "local-admin-token-0123456789";
const env = { ADMIN_TOKEN: TOKEN } as unknown as NodeJS.ProcessEnv;

describe("adminConfigured", () => {
  it("needs 24 or more characters", () => {
    expect(adminConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(adminConfigured({ ADMIN_TOKEN: "x".repeat(23) } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(adminConfigured({ ADMIN_TOKEN: "x".repeat(24) } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("tokenMatches", () => {
  it("accepts only the exact token", () => {
    expect(tokenMatches(TOKEN, env)).toBe(true);
    expect(tokenMatches("wrong", env)).toBe(false);
    expect(tokenMatches("", env)).toBe(false);
    expect(tokenMatches(`${TOKEN}x`, env)).toBe(false);
  });
  it("never matches when the admin is not configured", () => {
    expect(tokenMatches("", {} as NodeJS.ProcessEnv)).toBe(false);
    expect(tokenMatches("short", { ADMIN_TOKEN: "short" } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe("admin session", () => {
  beforeEach(() => {
    jar.clear();
    vi.stubEnv("ADMIN_TOKEN", TOKEN);
  });

  it("the session password is 64 hex characters and not the token", () => {
    expect(sessionPassword(env)).toMatch(/^[0-9a-f]{64}$/);
    expect(sessionPassword(env)).not.toContain(TOKEN);
  });

  it("requireAdmin rejects without a session", async () => {
    await expect(requireAdmin()).rejects.toThrow("Not authorised.");
  });

  it("requireAdmin rejects when the admin is not configured, even with a cookie", async () => {
    jar.set(ADMIN_COOKIE, await sealData({ admin: true }, { password: sessionPassword(env) }));
    vi.stubEnv("ADMIN_TOKEN", "");
    await expect(requireAdmin()).rejects.toThrow("Not authorised.");
  });

  it("requireAdmin accepts a cookie sealed with the right password and rejects any other", async () => {
    jar.set(ADMIN_COOKIE, await sealData({ admin: true }, { password: sessionPassword(env) }));
    await expect(requireAdmin()).resolves.toBeUndefined();
    jar.set(ADMIN_COOKIE, await sealData({ admin: true }, { password: "x".repeat(64) }));
    await expect(requireAdmin()).rejects.toThrow("Not authorised.");
    jar.set(ADMIN_COOKIE, "garbage");
    await expect(requireAdmin()).rejects.toThrow("Not authorised.");
  });

  it("a cookie without admin: true is not an admin session", async () => {
    jar.set(ADMIN_COOKIE, await sealData({}, { password: sessionPassword(env) }));
    await expect(requireAdmin()).rejects.toThrow("Not authorised.");
  });

  it("login with a wrong token returns an error and sets no cookie", async () => {
    const form = new FormData();
    form.set("token", "not-the-token");
    expect(await login(form)).toEqual({ error: "Wrong token." });
    expect(jar.has(ADMIN_COOKIE)).toBe(false);
  });

  it("login throws when the admin is not configured", async () => {
    vi.stubEnv("ADMIN_TOKEN", "");
    const form = new FormData();
    form.set("token", TOKEN);
    await expect(login(form)).rejects.toThrow();
  });

  it("every admin action rejects without a session", async () => {
    const form = new FormData();
    await expect(saveSettings(form)).rejects.toThrow("Not authorised.");
    await expect(createCode("x")).rejects.toThrow("Not authorised.");
    await expect(setCodeActive("00000000", true)).rejects.toThrow("Not authorised.");
    await expect(deleteCode("00000000")).rejects.toThrow("Not authorised.");
    await expect(deleteCourse("demo-aaaaaaaa")).rejects.toThrow("Not authorised.");
    await expect(logout()).rejects.toThrow("Not authorised.");
    await expect(saveTranslations([{ locale: "en", key: "landing.cta", value: "x" }])).rejects.toThrow("Not authorised.");
  });
});
