import {
  createFormController,
  type FormController,
  type FormControllerOptions,
  type FormState,
} from "@formkiln/core";
import type { FormDocument } from "@formkiln/spec";
import { useMemo, useSyncExternalStore } from "react";

/**
 * Creates a form controller for `form`. A new controller (and a fresh session) is created
 * only when `form` changes identity; later changes to `options` are ignored.
 */
export function useKilnForm(
  form: FormDocument,
  options: FormControllerOptions = {},
): FormController {
  return useMemo(() => createFormController(form, options), [form]);
}

/** Subscribes to a controller and returns its current state. */
export function useFormState(controller: FormController): FormState {
  return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
}
