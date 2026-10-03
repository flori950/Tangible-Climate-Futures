/**
 * Runtime configuration of the public API.
 *
 * All values come from environment variables (set by docker compose from the
 * repository-root `.env`, or by the shell / test setup). Nothing secret is
 * hard-coded here.
 */

/**
 * Parses a boolean flag. Only the literal string "true" (case-insensitive)
 * enables it; anything else, including an unset variable, disables it.
 */
export function parseBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

const config = {
  // URL of the MongoDB database to connect to.
  // With Docker, the name of the container can also be provided instead of the IP address.
  // Here: mongodb://<HOST>:<PORT>/<DATABASE_NAME>
  MONGODB_URL: process.env.MONGODB_URL ?? "mongodb://localhost:27017/datastore",
  // Port of the express server
  PORT: Number(process.env.PORT ?? 40000),
  // Host name of the express server (only used for log output)
  HOST: process.env.HOST ?? "localhost",
  // Disables the Firebase authentication for ALL API endpoints (not only Swagger).
  // Only active when explicitly set to "true".
  DISABLE_SWAGGER_AUTH: parseBooleanFlag(process.env.DISABLE_SWAGGER_AUTH),
  // URL of the data science (Python) server
  DATASCIENCE_BASE_URL: `http://${
    process.env.PYTHON_BACKEND_HOST ?? "localhost"
  }:${process.env.PYTHON_BACKEND_PORT ?? 50000}/api`,
  // Firebase project used to verify ID tokens. Verifying ID tokens only needs the project ID.
  // If unset, firebase-admin falls back to GOOGLE_CLOUD_PROJECT / application default credentials.
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
} as const;

export default config;
