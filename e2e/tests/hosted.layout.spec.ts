import { expect, test, type Page } from "@playwright/test";
import { expectAccessible } from "../lib/axe";

/** Box of a text input by the start of its label ("(optional)" may follow). */
async function box(page: Page, label: string) {
  const found = await page.getByRole("textbox", { name: new RegExp(`^${label}`) }).boundingBox();
  if (!found) throw new Error(`${label} is not visible`);
  return found;
}

test.describe("multi-column form (Form Schema §5.5)", () => {
  test("places elements on the grid in document order", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/f/e2eLayout");
    const given = await box(page, "First name");
    const family = await box(page, "Last name");
    const email = await box(page, "Email");
    // First name (1 column) and Last name (2 columns) share a row.
    expect(family.y).toBeCloseTo(given.y, 0);
    expect(family.x).toBeGreaterThan(given.x);
    expect(family.width / given.width).toBeGreaterThan(1.8);
    // Email has no width: a full row of its own.
    expect(email.y).toBeGreaterThan(given.y);
    expect(email.width).toBeGreaterThan(family.x + family.width - given.x - 2);

    // Inside the panel: Street (2) + House number (1) share a row; City (2) and Postcode (2)
    // do not fit together, and Postcode does not go back to fill the earlier gap.
    const street = await box(page, "Street");
    const house = await box(page, "House number");
    const city = await box(page, "City");
    const postcode = await box(page, "Postcode");
    expect(house.y).toBeCloseTo(street.y, 0);
    expect(city.y).toBeGreaterThan(street.y);
    expect(postcode.y).toBeGreaterThan(city.y);
    expect(postcode.x).toBeCloseTo(city.x, 0);

    await expectAccessible(page);
  });

  test("stacks into one column on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/f/e2eLayout");
    const given = await box(page, "First name");
    const family = await box(page, "Last name");
    expect(family.y).toBeGreaterThan(given.y);
    expect(family.x).toBeCloseTo(given.x, 0);
    expect(family.width).toBeCloseTo(given.width, 0);
    await expectAccessible(page);
  });

  test("keeps the focus order equal to the document order", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/f/e2eLayout");
    await page.getByRole("textbox", { name: /^First name/ }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: /^Last name/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("textbox", { name: /^Email/ })).toBeFocused();
  });

  test("submits like any other form", async ({ page }) => {
    await page.goto("/f/e2eLayout");
    await page.getByRole("textbox", { name: /^First name/ }).fill("Ada");
    await page.getByRole("textbox", { name: /^Last name/ }).fill("Lovelace");
    await page.getByRole("textbox", { name: /^Email/ }).fill("ada@example.com");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Address saved." })).toBeVisible();
  });
});
