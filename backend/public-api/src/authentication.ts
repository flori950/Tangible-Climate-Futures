import type { App as FirebaseApp } from "firebase-admin/app";
import type { DecodedIdToken } from "firebase-admin/auth";
import { Request } from "express";
import config from "./config/config";
import { UnauthorizedError } from "./errors";

/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * firebase-admin is loaded lazily (on the first authenticated request):
 * - the server boots without any Firebase configuration when auth is disabled,
 * - a transitive dependency of firebase-admin (buffer-equal-constant-time via
 *   jsonwebtoken/jws) crashes on Node.js >= 25 at import time, so loading it
 *   eagerly would make the whole API unusable there (see README, Known issues).
 */
function loadFirebaseApp(): typeof import("firebase-admin/app") {
  return require("firebase-admin/app");
}
function loadFirebaseAuth(): typeof import("firebase-admin/auth") {
  return require("firebase-admin/auth");
}
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Returns the (lazily initialized) Firebase Admin app.
 */
function getFirebaseApp(): FirebaseApp {
  const { getApps, initializeApp } = loadFirebaseApp();
  const [existingApp] = getApps();
  if (existingApp) {
    return existingApp;
  }
  return initializeApp(
    config.FIREBASE_PROJECT_ID
      ? { projectId: config.FIREBASE_PROJECT_ID }
      : undefined,
  );
}

/**
 * Authentication module used by the tsoa generated routes (see tsoa.json).
 * Called for every endpoint decorated with `@Security(...)`.
 *
 * @param request - The Express Request object.
 * @param securityName - The name of the security scheme (only "firebase" is supported).
 * @param _scopes - Optional scopes (not used).
 * @returns A Promise resolving to the decoded Firebase ID token (or `{}` when auth is disabled).
 * @throws UnauthorizedError if the token is missing/invalid or the scheme is unknown.
 */
export async function expressAuthentication(
  request: Request,
  securityName: string,
  _scopes?: string[],
): Promise<DecodedIdToken | Record<string, never>> {
  // Authentication is bypassed only when DISABLE_SWAGGER_AUTH is explicitly "true".
  if (config.DISABLE_SWAGGER_AUTH) {
    return {};
  }
  if (securityName !== "firebase") {
    throw new UnauthorizedError(`Unknown security scheme: ${securityName}`);
  }
  // Extract the Firebase ID token from the "Authorization: Bearer <token>" header.
  const header = request.headers["authorization"];
  const idToken =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice("Bearer ".length).trim()
      : undefined;
  if (!idToken) {
    throw new UnauthorizedError();
  }
  try {
    // Verify the authenticity of the Firebase ID token using the Firebase Admin SDK.
    const { getAuth } = loadFirebaseAuth();
    return await getAuth(getFirebaseApp()).verifyIdToken(idToken);
  } catch (error) {
    console.warn("Firebase ID token verification failed:", String(error));
    throw new UnauthorizedError();
  }
}

/**
 * Returns the Firebase UID of the authenticated user of a request, or `undefined`
 * when authentication is disabled. tsoa stores the result of `expressAuthentication`
 * in `request.user`.
 */
export function getRequestUserId(request: Request): string | undefined {
  const user = (request as Request & { user?: { uid?: unknown } }).user;
  return typeof user?.uid === "string" ? user.uid : undefined;
}
