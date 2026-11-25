import type { DefinitionError, FormDocument, JsonValue, ValidationError } from "@formkiln/spec";
import { isPlainObject, type JsonObject } from "../expression/values";
import { validateAnswers, type FormEvaluation } from "../form/answers";
import { validateDefinition } from "../form/definition";
import { evaluate } from "../expression/evaluate";
import { buildModel, type FormNode } from "../form/model";
import type { Expression, Field } from "@formkiln/spec";

/** Thrown when a controller is created for a form document that is not valid (Form Schema §10). */
export class FormDefinitionError extends Error {
  constructor(readonly errors: DefinitionError[]) {
    super(`Invalid form document: ${errors.map((e) => `${e.code} at ${e.pointer}`).join(", ")}`);
    this.name = "FormDefinitionError";
  }
}

export interface FormControllerOptions {
  /** Draft or prefill answers. They are validated like any other answers. */
  initialAnswers?: Readonly<Record<string, JsonValue>>;
  /** Locale for custom messages. Defaults to the form's `defaultLocale`. */
  locale?: string;
  /** Clock used for `date.today`. Defaults to the system clock. */
  now?: () => Date;
}

export type FormStatus = "editing" | "submitting" | "submitted";

export interface FormState {
  answers: Readonly<Record<string, JsonValue>>;
  /** Full evaluation of the current answers. */
  evaluation: FormEvaluation;
  /** Keys of the active pages, in order. */
  pages: readonly string[];
  /** Key of the page being shown (always an active page). */
  currentPage: string;
  isFirstPage: boolean;
  isLastPage: boolean;
  /** Errors the user should see now (see `errorsVisible`). */
  visibleErrors: readonly ValidationError[];
  /** True after the first submit attempt. */
  submitAttempted: boolean;
  status: FormStatus;
  /** Outcome of the successful submission, once submitted. */
  outcome: string | null;
}

export type StepResult =
  { ok: true } | { ok: false; errors: ValidationError[]; firstErrorPath: string; page: string };

export type SubmitResult =
  | { ok: true; submission: Record<string, JsonValue>; outcome: string | null }
  | { ok: false; errors: ValidationError[]; firstErrorPath: string; page: string };

export type SubmitHandler = (data: {
  submission: Record<string, JsonValue>;
  outcome: string | null;
}) => void | Promise<void>;

export interface FormController {
  readonly form: FormDocument;
  getState(): FormState;
  /** Subscribes to state changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Sets the value at a path: `key`, or `repeater.index.child`. */
  setValue(path: string, value: JsonValue): void;
  /** Marks a path as visited (usually on blur) so its errors become visible. */
  touch(path: string): void;
  addItem(repeaterKey: string): void;
  removeItem(repeaterKey: string, index: number): void;
  /** Validates the current page and moves to the next active page if it has no errors. */
  next(): StepResult;
  back(): void;
  goTo(pageKey: string): void;
  /**
   * Validates every active field. On errors, shows them and moves to the page of the first
   * error. Otherwise calls `handler` (if any) and marks the form as submitted. If the handler
   * throws, the form returns to editing and the error is rethrown. Throws if the form is
   * already submitting or submitted.
   */
  submit(handler?: SubmitHandler): Promise<SubmitResult>;
  /** Visible errors at a path or below it (for example composite members). */
  errorsAt(path: string): ValidationError[];
  /** Page key that contains the value at a path. */
  pageOf(path: string): string | undefined;
  /** Whether the element at a path is active. */
  isActive(path: string): boolean;
  /** Whether the field at a path is currently required (its `required` condition holds). */
  isRequired(path: string): boolean;
  /** Whether the field at a path is currently read-only (calculated, or `readOnly` holds). */
  isReadOnly(path: string): boolean;
}

const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}.`);

/** Creates a framework-agnostic controller for one form session. */
export function createFormController(
  form: FormDocument,
  options: FormControllerOptions = {},
): FormController {
  const definitionErrors = validateDefinition(form);
  if (definitionErrors.length > 0) throw new FormDefinitionError(definitionErrors);

  const model = buildModel(form);
  const clock = options.now ?? (() => new Date());
  const pageOfKey = new Map<string, string>();
  for (const node of model.nodes) {
    let page = node;
    while (page.parent) page = page.parent;
    if (!pageOfKey.has(node.key) && !node.repeater) pageOfKey.set(node.key, page.key);
  }
  const allPages = form.pages.map((page) => page.key);

  const listeners = new Set<() => void>();
  const touched = new Set<string>();
  const attemptedPages = new Set<string>();
  let answers: Record<string, JsonValue> = { ...(options.initialAnswers ?? {}) };
  let submitAttempted = false;
  let status: FormStatus = "editing";
  let outcome: string | null = null;
  let currentPage = allPages[0]!;
  let state: FormState;

  const pageOf = (path: string) => pageOfKey.get(path.split(".")[0]!);

  /** Resolves a field node from a path (`key` or `repeater.index.child`). */
  const fieldAt = (path: string): { node: FormNode; index: number | null } | undefined => {
    const [head, index, child] = path.split(".");
    if (index === undefined) {
      const node = model.topValues.get(head!);
      return node && node.kind === "field" ? { node, index: null } : undefined;
    }
    const node = model.repeaterFields.get(head!)?.get(child ?? "");
    return node ? { node, index: Number(index) } : undefined;
  };

  /**
   * Evaluates a field condition. The submission holds exactly the non-null effective
   * values, and absent paths resolve to null, so it serves as the rule data.
   */
  const conditionHolds = (path: string, property: "required" | "readOnly"): boolean => {
    const target = fieldAt(path);
    if (!target) return false;
    const condition = (target.node.source as Field)[property] as Expression | undefined;
    if (condition === undefined || typeof condition === "boolean") return condition === true;
    const { submission } = state.evaluation;
    const repeater = target.node.repeater;
    const items =
      repeater && Array.isArray(submission[repeater.key])
        ? (submission[repeater.key] as JsonValue[])
        : [];
    const item = target.index !== null ? items[target.index] : undefined;
    return (
      evaluate(condition, {
        data: submission as JsonObject,
        scope: target.index !== null ? { $item: item ?? {}, $index: target.index } : {},
        now: clock(),
        timeZone: form.settings?.timeZone ?? "UTC",
      }) === true
    );
  };

  const errorsVisible = (error: ValidationError) => {
    if (submitAttempted) return true;
    const page = pageOf(error.path);
    if (page !== undefined && attemptedPages.has(page)) return true;
    for (const path of touched) {
      if (isUnder(error.path, path)) return true;
    }
    return false;
  };

  const recompute = () => {
    const evaluation = validateAnswers(form, answers, {
      now: clock(),
      ...(options.locale !== undefined && { locale: options.locale }),
    });
    const inactive = new Set(evaluation.inactive);
    const pages = allPages.filter((key) => !inactive.has(key));
    if (!pages.includes(currentPage)) {
      // Stay as close as possible: the next active page, otherwise the previous one.
      const from = allPages.indexOf(currentPage);
      currentPage =
        allPages.slice(from + 1).find((key) => pages.includes(key)) ??
        [...allPages.slice(0, from)].reverse().find((key) => pages.includes(key)) ??
        pages[0] ??
        allPages[0]!;
    }
    const index = pages.indexOf(currentPage);
    state = {
      answers,
      evaluation,
      pages,
      currentPage,
      isFirstPage: index <= 0,
      isLastPage: index === pages.length - 1,
      visibleErrors: evaluation.errors.filter(errorsVisible),
      submitAttempted,
      status,
      outcome,
    };
    listeners.forEach((listener) => listener());
  };

  const update = (mutate: (draft: Record<string, JsonValue>) => void) => {
    const draft = { ...answers };
    mutate(draft);
    answers = draft;
    recompute();
  };

  const items = (draft: Record<string, JsonValue>, key: string): JsonObject[] =>
    Array.isArray(draft[key])
      ? (draft[key] as JsonValue[]).map((item) => (isPlainObject(item) ? { ...item } : {}))
      : [];

  const failure = (errors: ValidationError[]) => {
    const first = errors[0]!;
    return {
      ok: false as const,
      errors,
      firstErrorPath: first.path,
      page: pageOf(first.path) ?? currentPage,
    };
  };

  recompute();

  const controller: FormController = {
    form,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setValue(path, value) {
      const [head, index, child] = path.split(".");
      update((draft) => {
        if (index === undefined) {
          draft[head!] = value;
          return;
        }
        const list = items(draft, head!);
        const i = Number(index);
        if (!Number.isInteger(i) || i < 0 || i >= list.length || child === undefined) return;
        list[i] = { ...list[i], [child]: value };
        draft[head!] = list;
      });
    },
    touch(path) {
      if (touched.has(path)) return;
      touched.add(path);
      recompute();
    },
    addItem(key) {
      update((draft) => {
        draft[key] = [...items(draft, key), {}];
      });
    },
    removeItem(key, index) {
      // Paths of later items shift, so forget touched paths inside this repeater.
      for (const path of [...touched]) if (isUnder(path, key)) touched.delete(path);
      update((draft) => {
        draft[key] = items(draft, key).filter((_, i) => i !== index);
      });
    },
    next() {
      const errors = state.evaluation.errors.filter((error) => pageOf(error.path) === currentPage);
      if (errors.length > 0) {
        attemptedPages.add(currentPage);
        recompute();
        return failure(errors);
      }
      const index = state.pages.indexOf(currentPage);
      if (index < state.pages.length - 1) {
        currentPage = state.pages[index + 1]!;
        recompute();
      }
      return { ok: true };
    },
    back() {
      const index = state.pages.indexOf(currentPage);
      if (index > 0) {
        currentPage = state.pages[index - 1]!;
        recompute();
      }
    },
    goTo(pageKey) {
      if (state.pages.includes(pageKey) && pageKey !== currentPage) {
        currentPage = pageKey;
        recompute();
      }
    },
    async submit(handler) {
      if (status !== "editing") {
        throw new Error(`Cannot submit a form that is ${status}`);
      }
      submitAttempted = true;
      recompute();
      const { evaluation } = state;
      if (!evaluation.valid) {
        const result = failure(evaluation.errors);
        currentPage = result.page;
        recompute();
        return result;
      }
      status = "submitting";
      recompute();
      try {
        await handler?.({ submission: evaluation.submission, outcome: evaluation.outcome });
      } catch (error) {
        status = "editing";
        recompute();
        throw error;
      }
      status = "submitted";
      outcome = evaluation.outcome;
      recompute();
      return { ok: true, submission: evaluation.submission, outcome: evaluation.outcome };
    },
    errorsAt(path) {
      return state.visibleErrors.filter((error) => isUnder(error.path, path));
    },
    pageOf,
    isActive(path) {
      return !state.evaluation.inactive.includes(path);
    },
    isRequired(path) {
      return conditionHolds(path, "required");
    },
    isReadOnly(path) {
      const target = fieldAt(path);
      return (
        (target?.node.source as Field | undefined)?.calculate !== undefined ||
        conditionHolds(path, "readOnly")
      );
    },
  };
  return controller;
}
