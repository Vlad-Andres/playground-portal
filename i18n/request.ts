import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultStore } from "@/lib/jobs/store";
import { applyOverrides, DEFAULT_MESSAGES, MESSAGES_TAG, readOverrides } from "@/lib/translations";
import { LOCALE_COOKIE, pickLocale } from "./config";

// The owner's text overrides from /admin. Cached; saving in /admin invalidates the tag at once.
const loadOverrides = unstable_cache(() => readOverrides(defaultStore()), ["message-overrides"], { tags: [MESSAGES_TAG], revalidate: 3600 });

// The language lives in a cookie; URLs are the same in every language.
export default getRequestConfig(async () => {
  const locale = pickLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get("accept-language"));
  const overrides = await loadOverrides().catch(() => null);
  const messages = overrides ? applyOverrides(DEFAULT_MESSAGES[locale], overrides[locale]) : DEFAULT_MESSAGES[locale];
  return { locale, messages: messages as Record<string, unknown> };
});
