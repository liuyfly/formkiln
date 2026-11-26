import { expect, test } from "@playwright/test";
import { expectAccessible } from "../lib/axe";

test.describe("hosted form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/f/default/e2eContact");
    await expect(page.getByRole("heading", { name: "Contact us", level: 1 })).toBeVisible();
  });

  test("submits valid answers", async ({ page }) => {
    await page.getByLabel("Your name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill("ada@example.com");
    await expect(page.getByLabel("Order number")).toHaveCount(0);
    await page.getByRole("button", { name: /Topic/ }).click();
    await page.getByRole("option", { name: "Support" }).click();
    await page.getByLabel("Order number").fill("A-1001");
    await page.getByRole("textbox", { name: "Message" }).fill("My order has not arrived.");
    await page.getByText("You may contact me about this message.").click();
    await expect(page.getByRole("checkbox")).toBeChecked();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Thanks, we will be in touch." }),
    ).toBeVisible();
  });

  test("lists errors and moves focus to them", async ({ page }) => {
    await page.getByLabel("Email").fill("not an email");
    await page.getByRole("button", { name: "Submit" }).click();
    const summary = page.getByRole("alert").filter({ hasText: "There is a problem" });
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(page.getByLabel("Your name")).toHaveAttribute("aria-invalid", "true");
    await expect(summary.getByRole("link")).toHaveCount(5);
    await expectAccessible(page);

    // Following a link in the summary focuses the field.
    await summary.getByRole("link").first().click();
    await expect(page.getByLabel("Your name")).toBeFocused();
  });

  test("is accessible", async ({ page }) => {
    await expectAccessible(page);
  });
});

test("every page of the rental application is accessible", async ({ page }) => {
  await page.goto("/f/default/rentalApplication");
  await expect(page.getByRole("heading", { name: "Rental application", level: 1 })).toBeVisible();
  await expectAccessible(page);
  // Show the errors of the first page, then check the localized version.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expectAccessible(page);
  await page.goto("/f/default/rentalApplication?lang=zh-CN");
  await expect(page.getByRole("heading", { name: "租房申请", level: 1 })).toBeVisible();
  await expectAccessible(page);
});

test("unknown forms are not found", async ({ page }) => {
  const response = await page.goto("/f/default/noSuchForm");
  expect(response?.status()).toBe(404);
});
