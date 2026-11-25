import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Fails with a readable list when the page has WCAG 2.1 A or AA violations. */
export async function expectAccessible(page: Page, include?: string): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  const report = violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n` +
      violation.nodes
        .map(
          (node) =>
            `  ${node.target.join(" ")}: ${node.html.slice(0, 160)}\n    ${node.failureSummary ?? ""}`,
        )
        .join("\n"),
  );
  expect(report, `Accessibility violations on ${page.url()}`).toEqual([]);
}
