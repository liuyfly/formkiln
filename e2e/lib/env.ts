/** Where the apps and backing services of the test run live (see compose.yml). */
export const API_URL = process.env.FORMKILN_API_URL ?? "http://localhost:8080";
export const HOSTED_URL = process.env.FORMKILN_HOSTED_URL ?? "http://localhost:3100";
export const ADMIN_URL = process.env.FORMKILN_ADMIN_URL ?? "http://localhost:3200";
export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8026";
export const SERVICE_TOKEN = process.env.FORMKILN_SERVICE_TOKEN ?? "e2e-service-token";
export const ADMIN_EMAIL = process.env.FORMKILN_BOOTSTRAP_ADMIN_EMAIL ?? "admin@e2e.test";
/** Generated per run; only lives in the throwaway test database. */
export const ADMIN_PASSWORD = `E2e-${Date.now().toString(36)}-correct-horse`;
export const STORAGE_STATE = new URL("../.auth/admin.json", import.meta.url).pathname;
export const ACCOUNT_FILE = new URL("../.auth/account.json", import.meta.url).pathname;
export const TOTP_STEP_FILE = new URL("../.auth/totp-step", import.meta.url).pathname;
