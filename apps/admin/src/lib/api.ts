/** Browser-side client for the admin and management API (through this app's /v1 gateway). */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
    /** The `errors` member of the problem detail, if any. */
    readonly errors: unknown[] = [],
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
  if (
    response.status === 401 &&
    !path.startsWith("/v1/admin/auth/") &&
    !path.startsWith("/v1/admin/invitations/")
  ) {
    // The session ended (idle timeout, signed out elsewhere): sign in again and come back.
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as {
      code?: string;
      detail?: string;
      title?: string;
      errors?: unknown[];
    };
    throw new ApiError(
      response.status,
      problem.code,
      problem.detail ?? problem.title ?? `Request failed (${response.status})`,
      Array.isArray(problem.errors) ? problem.errors : [],
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

/** A workspace the account belongs to, with its role there. */
export interface Membership {
  slug: string;
  name: string;
  role: Role;
  archived: boolean;
}

/** A signed-in account. Roles belong to workspace memberships. */
export interface User {
  id: string;
  email: string;
  status: "active" | "disabled";
  instanceAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  workspaces: Membership[];
  /** Instance admins: workspaces open to them read-only right now (break-glass access). */
  access?: AccessWindow[];
}

/** A workspace an instance admin may read without being a member, until `expiresAt`. */
export interface AccessWindow {
  slug: string;
  name: string;
  expiresAt: string;
}

/** A workspace with its size, as instance admins see it. */
export interface WorkspaceSummary {
  slug: string;
  name: string;
  createdAt: string;
  archivedAt: string | null;
  members: number;
  forms: number;
}

/** Workspace slugs: lower-case letters, digits and inner hyphens (part of every URL). */
const SLUG = /^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/;

export function isSlug(value: string): boolean {
  return SLUG.test(value);
}

/** A workspace service token as listed (never the token itself). */
export interface ServiceToken {
  id: string;
  name: string;
  role: "editor" | "viewer";
  createdAt: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

/** A member of a workspace. */
export interface Member {
  id: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  lastLoginAt: string | null;
  addedAt: string;
}

/** Adding someone by email: existing accounts are added at once, others are invited. */
export type AddMemberResult =
  | { result: "added"; member: Member; invitation: null }
  | { result: "invited"; member: null; invitation: Invitation };

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
  /** Name of the workspace the invitation is for. */
  workspace: string | null;
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

/** Archiving and restoring forms, members and the audit log are for workspace admins. */
export function isAdmin(access: { role: Role | null }): boolean {
  return access.role === "admin";
}

export function canEdit(access: { role: Role | null }): boolean {
  return access.role === "admin" || access.role === "editor";
}

/** Base path of a workspace's management API. */
export function manageApi(workspace: string): string {
  return `/v1/manage/workspaces/${workspace}`;
}

/** Base path of a workspace's administration API (members, audit log, erasure). */
export function adminApi(workspace: string): string {
  return `/v1/admin/workspaces/${workspace}`;
}

const FORM_KEY = /^[a-z][a-zA-Z0-9_]{0,63}$/;

export function isFormKey(value: string): boolean {
  return FORM_KEY.test(value);
}

export interface FormSummary {
  key: string;
  /** Title in the form's default language (of the latest edits); null when unknown. */
  title: string | null;
  accessMode: "public" | "token";
  /** Null until the form is published. */
  latestVersion: number | null;
  latestPublishedAt: string | null;
  submissionCount: number;
  /** A working copy with changes that are not published yet. */
  unpublishedChanges: boolean;
  /** Days submissions are kept; null keeps them until deleted. */
  retentionDays: number | null;
  /** The folder the form is in; null at the top level. */
  folderId: string | null;
  /** Set when the form is archived (hidden, not served, data kept). */
  archivedAt: string | null;
}

/** A folder of forms (one level) with its count of active forms. */
export interface Folder {
  id: string;
  name: string;
  formCount: number;
}

export interface Version {
  version: number;
  publishedAt: string;
}

export interface Submission {
  id: string;
  version: number;
  outcome: string | null;
  submittedAt: string;
  subject: string | null;
  data: Record<string, unknown>;
}

export interface Webhook {
  id: string;
  url: string;
  createdAt: string;
  secret: string | null;
}

export interface Delivery {
  id: string;
  event: string;
  submissionId: string;
  status: "pending" | "succeeded" | "dead";
  attempts: number;
  nextAttemptAt: string | null;
  lastStatus: number | null;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorType: "user" | "service" | "system" | "anonymous";
  actorId: string | null;
  actorEmail: string | null;
  /** Slug of the workspace the entry belongs to; null for sign-ins and account events. */
  workspace: string | null;
  action: string;
  target: string | null;
  ip: string | null;
  details: string | null;
}

/** A static problem of a form document (JSON pointer and code). */
export interface DefinitionError {
  pointer: string;
  code: string;
}

export interface NotificationSettings {
  teamRecipients: string[];
  teamIncludeAnswers: boolean;
  confirmationEnabled: boolean;
  confirmationEmailField: string | null;
  confirmationSubject: string | null;
  confirmationBody: string | null;
  resumeEnabled: boolean;
  defaultConfirmationSubject: string;
  defaultConfirmationBody: string;
}

export interface MailEntry {
  id: string;
  kind: "team" | "confirmation" | "resume";
  submissionId: string | null;
  recipient: string;
  status: "pending" | "sent" | "dead";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface ErasureResult {
  forms: Record<string, number>;
  total: number;
  deleted: boolean;
  note: string;
}
