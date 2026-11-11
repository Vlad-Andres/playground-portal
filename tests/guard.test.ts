import { describe, expect, it } from "vitest";
import { accessCodeMatches, dayKey, generationEnabled, LANGUAGES, LEVELS, underDailyLimit } from "@/lib/guard";

const code = "abcdefghijkl"; // 12 characters
const env = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;

describe("generationEnabled", () => {
  it("is false when the flag is on but the code is missing", () => {
    expect(generationEnabled(env({ PORTAL_ENABLE_GENERATION: "true" }))).toBe(false);
  });
  it("is false when the code is shorter than 12 characters", () => {
    expect(generationEnabled(env({ PORTAL_ENABLE_GENERATION: "true", PORTAL_ACCESS_CODE: "short" }))).toBe(false);
  });
  it("is false when the flag is off", () => {
    expect(generationEnabled(env({ PORTAL_ENABLE_GENERATION: "false", PORTAL_ACCESS_CODE: code }))).toBe(false);
  });
  it("is true with the flag and a long enough code", () => {
    expect(generationEnabled(env({ PORTAL_ENABLE_GENERATION: "true", PORTAL_ACCESS_CODE: code }))).toBe(true);
  });
});

describe("accessCodeMatches", () => {
  const configured = env({ PORTAL_ACCESS_CODE: code });
  it("matches the same code", () => expect(accessCodeMatches(code, configured)).toBe(true));
  it("rejects a different length", () => expect(accessCodeMatches(code + "x", configured)).toBe(false));
  it("rejects one changed character", () => expect(accessCodeMatches("abcdefghijkm", configured)).toBe(false));
  it("rejects anything when no code is configured", () => expect(accessCodeMatches("", env({}))).toBe(false));
});

describe("dayKey", () => {
  it("uses the UTC day", () => expect(dayKey(new Date("2026-11-11T23:59:59Z"))).toBe("2026-11-11"));
});

describe("underDailyLimit", () => {
  it("is false when the count equals the limit", async () => {
    expect(await underDailyLimit("2026-11-11", 3, async () => 3)).toBe(false);
  });
  it("is true below the limit and lists the day prefix", async () => {
    let seen = "";
    expect(await underDailyLimit("2026-11-11", 3, async (prefix) => { seen = prefix; return 2; })).toBe(true);
    expect(seen).toBe("days/2026-11-11/");
  });
});

describe("lists", () => {
  it("has the nine languages and three levels", () => {
    expect(LANGUAGES).toHaveLength(9);
    expect(LEVELS).toEqual(["school", "university", "professional"]);
  });
});
