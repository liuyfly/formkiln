import { expect, test } from "@playwright/test";

/**
 * Budgets for a 600-field page (300 numbers, 300 conditional follow-ups, a calculation over all
 * of them). Generous enough for shared CI runners; a regression in the evaluation strategy (for
 * example re-evaluating every expression per field) blows through them.
 */
const LOAD_BUDGET_MS = Number(process.env.E2E_LOAD_BUDGET_MS ?? 5000);
const INPUT_BUDGET_MS = Number(process.env.E2E_INPUT_BUDGET_MS ?? 750);

test("a large form stays responsive", async ({ page }) => {
  const started = Date.now();
  await page.goto("/f/e2eLarge");
  await expect(page.getByRole("textbox", { name: /^Amount 300\b/ })).toBeVisible();
  const loaded = Date.now() - started;

  const amount = page.getByRole("textbox", { name: /^Amount 1\b/ });
  const reason = page.getByRole("textbox", { name: /^Reason for amount 1\b/ });
  await expect(reason).toHaveCount(0);
  const typed = Date.now();
  // Number fields commit their value when the person leaves them.
  await amount.fill("600");
  await amount.press("Tab");
  await expect(reason).toBeVisible();
  const responded = Date.now() - typed;

  // The total crosses 1000 only with a second amount.
  await expect(page.getByRole("textbox", { name: /^Approver/ })).toHaveCount(0);
  await page.getByRole("textbox", { name: /^Amount 250\b/ }).fill("500");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: /^Approver/ })).toBeVisible();

  test
    .info()
    .annotations.push(
      { type: "load", description: `${loaded} ms` },
      { type: "input", description: `${responded} ms` },
    );
  console.log(`large form: load ${loaded} ms, input to visible ${responded} ms`);
  expect(loaded).toBeLessThan(LOAD_BUDGET_MS);
  expect(responded).toBeLessThan(INPUT_BUDGET_MS);
});
