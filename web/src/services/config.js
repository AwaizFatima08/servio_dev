// ─────────────────────────────────────────
// config.js — single source of the API base URL
// HomiLabs | Servio | Web
//
// The URL is NOT written here. It comes from the Vite environment file
// (.env.development or .env.production) chosen automatically at build time.
// Every service imports BASE_URL from this file — nowhere else defines it.
// ─────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Safety net: if the env file is missing or the variable is misnamed,
// fail loudly at startup instead of sending requests to "undefined/...".
if (!BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL is not set. Check that .env.development / .env.production ' +
    'exists and defines VITE_API_BASE_URL.'
  );
}

export { BASE_URL };