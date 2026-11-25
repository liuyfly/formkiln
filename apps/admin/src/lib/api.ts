/** Browser-side client for the admin and management API (through this app's /v1 gateway). */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

/** Calls the API; throws ApiError with the problem detail on failure. */
export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      // Required on unsafe requests (CSRF defence of formkiln-server).
      "X-Requested-With": "formkiln",
      ...(options.body !== undefined && { "Content-Type": "application/json" }),
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as {
      code?: string;
      detail?: string;
      title?: string;
    };
    throw new ApiError(
      response.status,
      problem.code,
      problem.detail ?? problem.title ?? `Request failed (${response.status})`,
    );
  }
  if (response.status === 204 || response.status === 202) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

export type Role = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TotpEnrollment {
  secret: string;
  otpauthUri: string;
}

export interface LoginChallenge {
  challenge: string;
  enrollTotp: TotpEnrollment | null;
}

export interface SignedIn {
  user: User;
  recoveryCodes?: string[];
}

export interface InvitationDetails {
  email: string;
  role: Role;
  expiresAt: string;
  totp: TotpEnrollment;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
}

export interface Session {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
  current: boolean;
}

/** Reads `#token=...` from the URL fragment (links in emails keep tokens out of server logs). */
export function fragmentToken(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.hash.slice(1)).get("token");
}
