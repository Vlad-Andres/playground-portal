import { Google } from "arctic";

export const GOOGLE_SCOPES = ["openid", "profile"];

/**
 * The one address sign-in runs on. On Vercel production that is the project's production domain, so a
 * visit through a deployment's own *.vercel.app address still matches the redirect URI registered at
 * Google (and the sign-in cookies live on one host). Elsewhere it is the address of the request.
 */
export function canonicalOrigin(requestUrl: string, env: NodeJS.ProcessEnv = process.env): string {
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return new URL(requestUrl).origin;
}

export function googleClient(requestUrl: string): Google {
  return new Google(process.env.AUTH_GOOGLE_ID ?? "", process.env.AUTH_GOOGLE_SECRET ?? "", `${canonicalOrigin(requestUrl)}/api/auth/google/callback`);
}
