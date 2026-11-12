import { Google } from "arctic";

export const GOOGLE_SCOPES = ["openid", "profile"];

export function googleClient(requestUrl: string): Google {
  return new Google(process.env.AUTH_GOOGLE_ID ?? "", process.env.AUTH_GOOGLE_SECRET ?? "", new URL("/api/auth/google/callback", requestUrl).toString());
}
