import { expect, test } from "@playwright/test";
import { account } from "../lib/account";
import { submit } from "../lib/api";
import { expectAccessible } from "../lib/axe";
import { totp } from "../lib/totp";

test("lists forms and their submissions", async ({ page }) => {
  const marker = `Grace ${Date.now()}`;
  await submit("e2eContact", {
    name: marker,
    email: "grace@example.com",
    topic: "sales",
    message: "Hello",
    consent: true,
  });

  await page.goto("/forms");
  await expect(page.getByRole("heading", { name: "Forms", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "e2eContact" }).click();
  await expect(page.getByRole("heading", { name: "e2eContact", level: 1 })).toBeVisible();
  // Submissions is the first tab.
  await expect(page.getByText(marker).first()).toBeVisible();
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signs in with a password and an authenticator code", async ({ page }) => {
    const { email, password, secret } = account();
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expectAccessible(page);

    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert")).toBeVisible();

    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("6-digit code").fill(totp(secret));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();

    const cookies = await page.context().cookies();
    expect((await page.request.get("/v1/admin/auth/me")).status()).toBe(200);
    await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);

    // The session is revoked on the server, not only forgotten by the browser.
    await page.context().addCookies(cookies);
    expect((await page.request.get("/v1/admin/auth/me")).status()).toBe(401);
  });
});

for (const path of [
  "/",
  "/forms",
  "/forms/e2eContact",
  "/forms/e2eContact/versions",
  "/forms/e2eContact/sharing",
  "/forms/e2eContact/webhooks",
  "/forms/e2eContact/notifications",
  "/forms/e2eContact/data",
  "/forms/e2eContact/edit",
  "/members",
  "/audit",
  "/data-requests",
  "/settings",
]) {
  test(`${path} is accessible`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expectAccessible(page);
  });
}
