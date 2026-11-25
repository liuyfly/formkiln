/**
 * A deliberately large single-page form: `count` number fields, a follow-up text field shown
 * when each number is positive, and a hidden total over every number that controls one more
 * field. Every keystroke re-evaluates all conditions and the calculation.
 */
export function largeForm(count: number): Record<string, unknown> {
  const elements: unknown[] = [];
  for (let i = 1; i <= count; i++) {
    elements.push({ type: "number", key: `amount${i}`, label: `Amount ${i}` });
    elements.push({
      type: "text",
      key: `reason${i}`,
      label: `Reason for amount ${i}`,
      visible: { ">": [{ var: `amount${i}` }, 0] },
    });
  }
  const terms = Array.from({ length: count }, (_, index) => ({
    if: [{ empty: { var: `amount${index + 1}` } }, 0, { var: `amount${index + 1}` }],
  }));
  elements.push({
    type: "hidden",
    key: "total",
    label: "Total",
    valueType: "number",
    calculate: { "+": terms },
  });
  elements.push({
    type: "text",
    key: "approver",
    label: "Approver (totals over 1000)",
    visible: { ">": [{ var: "total" }, 1000] },
  });
  return {
    schemaVersion: 1,
    key: "e2eLarge",
    title: "Large form",
    pages: [{ key: "main", elements }],
    submit: { outcomes: [{ key: "done" }] },
  };
}
