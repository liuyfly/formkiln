import { readFileSync } from "node:fs";
import { ACCOUNT_FILE } from "./env";

/** The admin account created by admin.setup.ts. */
export function account(): { email: string; password: string; secret: string } {
  return JSON.parse(readFileSync(ACCOUNT_FILE, "utf8")) as {
    email: string;
    password: string;
    secret: string;
  };
}
