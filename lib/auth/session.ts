import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { accountsConfigured, USER_ID } from "./config";

export interface User {
  uid: string;
  name: string;
}

const COOKIE = "pg_user";

async function session() {
  return getIronSession<Partial<User>>(await cookies(), {
    cookieName: COOKIE,
    password: process.env.SESSION_SECRET ?? "",
    ttl: 30 * 24 * 60 * 60,
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
  });
}

/** The signed-in person, or null when accounts are off or nobody is signed in. */
export async function currentUser(): Promise<User | null> {
  if (!accountsConfigured(process.env)) return null;
  try {
    const data = await session();
    return typeof data.uid === "string" && USER_ID.test(data.uid) ? { uid: data.uid, name: typeof data.name === "string" ? data.name : "" } : null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}

export async function saveUser(user: User): Promise<void> {
  const data = await session();
  data.uid = user.uid;
  data.name = user.name.slice(0, 60);
  await data.save();
}

export async function clearUser(): Promise<void> {
  if (!accountsConfigured(process.env)) return;
  (await session()).destroy();
}
