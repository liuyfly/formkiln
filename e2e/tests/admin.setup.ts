import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test as setup, type Page } from "@playwright/test";
import { account } from "../lib/account";
import { waitForMail } from "../lib/api";
import { ACCOUNT_FILE, ADMIN_EMAIL, ADMIN_PASSWORD, STORAGE_STATE } from "../lib/env";
import { freshTotp } from "../lib/totp";

/**
 * Onboards the bootstrap admin the way a person would: the invitation email, a password and an
 * authenticator. Then saves the signed-in session for the admin tests. Against a database that
 * already has the account (a local rerun), it signs in with the saved credentials instead.
 */
setup("sign in as the bootstrap admin", async ({ page }) => {
  setup.setTimeout(60_000); // May wait for a fresh authenticator code.
  if (existsSync(ACCOUNT_FILE)) {
    await signIn(page);
  } else {
    await acceptInvitation(page);
  }
  await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.context().storageState({ path: STORAGE_STATE });
});

async function acceptInvitation(page: Page): Promise<void> {
  const link = await waitForMail(ADMIN_EMAIL, /http\S+\/invite#token=\S+/);
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Join Formkiln" })).toBeVisible();

  const secret = (await page.locator("code").innerText()).replace(/\s/g, "");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("textbox", { name: "Confirm password" }).fill(ADMIN_PASSWORD);
  await page.getByLabel("6-digit code").fill(await freshTotp(secret));
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Welcome to Formkiln" })).toBeVisible();
  mkdirSync(dirname(ACCOUNT_FILE), { recursive: true });
  writeFileSync(
    ACCOUNT_FILE,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, secret }),
  );
  await page.getByRole("button", { name: "Continue" }).click();
}

async function signIn(page: Page): Promise<void> {
  const { email, password, secret } = account();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("6-digit code").fill(await freshTotp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
}
