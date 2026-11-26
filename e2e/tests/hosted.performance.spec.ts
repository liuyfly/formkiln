import { expect, test, type Page } from "@playwright/test";

/**
 * Budgets for a 600-field page (300 numbers, 300 conditional follow-ups, a calculation over all
 * of them). Generous enough for shared CI runners; a regression in the evaluation strategy (for
 * example re-evaluating every expression per field) blows through them.
 */
const LOAD_BUDGET_MS = Number(process.env.E2E_LOAD_BUDGET_MS ?? 5000);
const INPUT_BUDGET_MS = Number(process.env.E2E_INPUT_BUDGET_MS ?? 750);

/**
 * Milliseconds from committing amount `i` (number fields commit on blur) until its follow-up field
 * is in the page, measured with the page's own clock so that Playwright's round trips and polling
 * do not count.
 */
async function inputToVisible(page: Page, i: number): Promise<number> {
  await page.getByRole("textbox", { name: new RegExp(`^Amount ${i}\\b`) }).fill("100");
  return page.evaluate(
    (path) =>
      new Promise<number>((resolve) => {
        const shown = () => document.querySelector(`[data-fk-path="${path}"]`) !== null;
        const start = performance.now();
        const observer = new MutationObserver(() => {
          if (shown()) {
            observer.disconnect();
            resolve(performance.now() - start);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        (document.activeElement as HTMLElement | null)?.blur();
      }),
    `reason${i}`,
  );
}

test("a large form stays responsive", async ({ page }) => {
  const started = Date.now();
  await page.goto("/f/e2eLarge");
  await expect(page.getByRole("textbox", { name: /^Amount 300\b/ })).toBeVisible();
  const loaded = Date.now() - started;

  await expect(page.getByRole("textbox", { name: /^Reason for amount 1\b/ })).toHaveCount(0);
  // The median of three edits: one slow sample on a shared runner does not fail the test.
  const samples = [
    await inputToVisible(page, 1),
    await inputToVisible(page, 2),
    await inputToVisible(page, 3),
  ];
  const responded = Math.round([...samples].sort((a, b) => a - b)[1]!);
  await expect(page.getByRole("textbox", { name: /^Reason for amount 3\b/ })).toBeVisible();

  // The samples total 300; the total crosses 1000 only with a larger amount.
  await expect(page.getByRole("textbox", { name: /^Approver/ })).toHaveCount(0);
  await page.getByRole("textbox", { name: /^Amount 250\b/ }).fill("800");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: /^Approver/ })).toBeVisible();

  test
    .info()
    .annotations.push(
      { type: "load", description: `${loaded} ms` },
      { type: "input", description: `${responded} ms` },
    );
  console.log(
    `large form: load ${loaded} ms, input to visible ${responded} ms (samples ${samples.map(Math.round).join(", ")})`,
  );
  expect(loaded).toBeLessThan(LOAD_BUDGET_MS);
  expect(responded).toBeLessThan(INPUT_BUDGET_MS);
});
