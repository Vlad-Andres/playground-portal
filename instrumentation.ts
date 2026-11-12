import type { Instrumentation } from "next";
import { logEvent, logMessage } from "@/lib/log";

/** Server errors become one log line each: the path, the method, the message and the digest. */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  logEvent("request.error", {
    path: request.path,
    method: request.method,
    message: logMessage(err),
    digest,
  });
};
