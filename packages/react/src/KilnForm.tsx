import type { FormController, FormControllerOptions, SubmitHandler } from "@formkiln/core";
import type {
  ContentElement,
  Element,
  Field,
  FormDocument,
  ItemElement,
  JsonValue,
  Page,
  PanelElement,
  RepeaterElement,
  Text,
  ValidationError,
} from "@formkiln/spec";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, I18nProvider } from "react-aria-components";
import { defaultComponents } from "./fields/fields";
import { Markdown } from "./markdown";
import { defaultMessages, errorText, format, type Messages } from "./messages";
import { resolveText } from "./text";
import type { FieldComponents, UploadFile } from "./types";
import { useFormState, useKilnForm } from "./useKilnForm";

export interface KilnFormProps {
  /** A valid Formkiln form document. */
  form: FormDocument;
  /** Draft or prefill answers. */
  initialAnswers?: FormControllerOptions["initialAnswers"];
  /** UI and message locale. Defaults to the form's `defaultLocale`. */
  locale?: string;
  /** Clock for `date.today` (mainly for tests). */
  now?: () => Date;
  /** Use an existing controller instead of creating one (advanced). */
  controller?: FormController;
  /** Called with the answers after every change (for example to save a draft). */
  onChange?: (answers: Readonly<Record<string, JsonValue>>) => void;
  onPageChange?: (pageKey: string) => void;
  /** Called whenever moving on or submitting is blocked by errors. */
  onValidationError?: (errors: ValidationError[]) => void;
  /** Called with the submission and outcome of a valid form. Throw to report a failure. */
  onSubmit?: SubmitHandler;
  /** Uploads a file and returns its reference. File fields are disabled without it. */
  uploadFile?: UploadFile;
  /** Replace the components of some field types. */
  components?: FieldComponents;
  /** Override some or all user interface strings. */
  messages?: Partial<Messages>;
  /** Rendered instead of the default confirmation once the form is submitted. */
  renderSubmitted?: (outcome: string | null) => ReactNode;
  className?: string;
}

const domId = (formKey: string, path: string) =>
  `fk-${formKey}-${path.replace(/[^A-Za-z0-9_-]/g, "-")}`;

/** Inputs are preferred over buttons, so a new repeater item focuses its first field. */
const INPUTS = 'input:not([type="file"]), textarea, select, [role="spinbutton"], [role="radio"]';
const FOCUSABLE = 'button, [tabindex]:not([tabindex="-1"])';

/** Renders a Formkiln form and runs its session. */
export function KilnForm(props: KilnFormProps) {
  const { form } = props;
  const locale = props.locale ?? form.settings?.defaultLocale ?? "en";
  const ownController = useKilnForm(form, {
    ...(props.initialAnswers && { initialAnswers: props.initialAnswers }),
    locale,
    ...(props.now && { now: props.now }),
  });
  const controller = props.controller ?? ownController;
  const state = useFormState(controller);
  const messages: Messages = { ...defaultMessages(locale), ...props.messages };
  const components = { ...defaultComponents, ...props.components };
  const text = (value: Text | undefined) => resolveText(value, locale, form);
  const single = form.settings?.navigation === "single";

  const allElements = form.pages.flatMap(function collect(
    node: Page | Element | ItemElement,
  ): (Element | ItemElement)[] {
    const children = "elements" in node ? (node.elements as (Element | ItemElement)[]) : [];
    return [...("type" in node ? [node] : []), ...children.flatMap(collect)];
  });

  /** The element kind at an error path, so count errors get a specific message. */
  const describeError = (error: ValidationError) => {
    const [head, , child] = error.path.split(".");
    const top = allElements.find((element) => element.key === head);
    let kind: string | undefined = top?.type;
    let action: string | undefined;
    if (top?.type === "repeater") {
      if (child === undefined) {
        action = format(messages.addItem, {
          item: text(top.itemLabel) ?? text(top.label) ?? top.key,
        });
      } else {
        kind = allElements.find((element) => element.key === child && element !== top)?.type;
      }
    }
    return errorText(error, messages, { kind, action, locale });
  };

  const rootRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [focusTarget, setFocusTarget] = useState<"summary" | "page" | null>(null);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);

  // Callbacks for answer and page changes, skipping the initial render.
  const previous = useRef({ answers: state.answers, page: state.currentPage });
  useEffect(() => {
    if (state.answers !== previous.current.answers) props.onChange?.(state.answers);
    if (state.currentPage !== previous.current.page) {
      props.onPageChange?.(state.currentPage);
      if (focusTarget === null) setFocusTarget("page");
    }
    previous.current = { answers: state.answers, page: state.currentPage };
  });

  useEffect(() => {
    if (focusTarget === "summary") summaryRef.current?.focus();
    if (focusTarget === "page") {
      rootRef.current?.querySelector<HTMLElement>(".fk-page-title")?.focus();
      rootRef.current?.scrollIntoView?.({ block: "start" });
    }
    if (focusTarget !== null) setFocusTarget(null);
  }, [focusTarget]);

  const focusField = (path: string) => {
    let current = path;
    for (;;) {
      const container = rootRef.current?.querySelector(`[data-fk-path="${CSS.escape(current)}"]`);
      const target =
        container?.querySelector<HTMLElement>(INPUTS) ??
        container?.querySelector<HTMLElement>(FOCUSABLE);
      if (target) {
        target.focus();
        return;
      }
      const cut = current.lastIndexOf(".");
      if (cut < 0) return;
      current = current.slice(0, cut);
    }
  };

  useEffect(() => {
    if (pendingFocus === null) return;
    focusField(pendingFocus);
    setPendingFocus(null);
  });

  const blocked = (errors: ValidationError[]) => {
    setShowSummary(true);
    setFocusTarget("summary");
    props.onValidationError?.(errors);
  };

  const onNext = () => {
    const result = controller.next();
    if (!result.ok) blocked(result.errors);
    else setShowSummary(false);
  };

  const onSubmit = async () => {
    setSubmitError(false);
    try {
      const result = await controller.submit(props.onSubmit);
      if (!result.ok) blocked(result.errors);
    } catch {
      setSubmitError(true);
    }
  };

  if (state.status === "submitted") {
    const outcome = form.submit?.outcomes?.find((candidate) => candidate.key === state.outcome);
    return (
      <div ref={rootRef} className={["fk-form", props.className].filter(Boolean).join(" ")}>
        {props.renderSubmitted ? (
          props.renderSubmitted(state.outcome)
        ) : (
          <div className="fk-submitted" role="status">
            {text(outcome?.message) ?? messages.submitted}
          </div>
        )}
      </div>
    );
  }

  const pages = single
    ? form.pages.filter((page) => state.pages.includes(page.key))
    : form.pages.filter((page) => page.key === state.currentPage);
  const summaryErrors = state.visibleErrors.filter(
    (error) => single || controller.pageOf(error.path) === state.currentPage,
  );
  const pageIndex = state.pages.indexOf(state.currentPage);

  const valueAt = (path: string): JsonValue => {
    const [head, index, child] = path.split(".");
    if (index === undefined) return state.answers[head!] ?? null;
    const items = state.answers[head!];
    const item = Array.isArray(items) ? items[Number(index)] : undefined;
    return item && typeof item === "object" && !Array.isArray(item) ? (item[child!] ?? null) : null;
  };

  /** Renders an element; `prefix` is `""` at the top level and `repeater.index.` inside items. */
  const renderElement = (element: Element | ItemElement, prefix: string): ReactNode => {
    const path = prefix + element.key;
    if (!controller.isActive(path)) return null;
    switch (element.type) {
      case "content":
        return <Content key={path} element={element} text={text} />;
      case "panel":
        return (
          <Panel
            key={path}
            element={element}
            text={text}
            renderChild={(child) => renderElement(child, prefix)}
          />
        );
      case "repeater":
        return renderRepeater(element, path);
      default:
        return renderField(element, path);
    }
  };

  const renderRepeater = (element: RepeaterElement, path: string): ReactNode => {
    const items = Array.isArray(state.answers[path]) ? (state.answers[path] as JsonValue[]) : [];
    const id = domId(form.key, path);
    const ownErrors = controller.errorsAt(path).filter((error) => error.path === path);
    const itemLabel = text(element.itemLabel) ?? text(element.label) ?? element.key;
    const full = element.maxItems !== undefined && items.length >= element.maxItems;
    return (
      <fieldset
        key={path}
        className="fk-repeater"
        data-fk-path={path}
        data-invalid={ownErrors.length > 0 || undefined}
        {...(ownErrors.length > 0 && { "aria-describedby": `${id}-error` })}
      >
        <legend className="fk-label">{text(element.label)}</legend>
        {text(element.description) && <p className="fk-description">{text(element.description)}</p>}
        {ownErrors.length > 0 && (
          <div id={`${id}-error`} className="fk-error">
            {ownErrors.map((error) => describeError(error)).join(" ")}
          </div>
        )}
        {items.map((_, index) => {
          const heading = format(messages.itemHeading, { item: itemLabel, index: index + 1 });
          return (
            <div
              key={index}
              className="fk-repeater-item"
              role="group"
              aria-labelledby={`${id}-${index}-title`}
              data-fk-path={`${path}.${index}`}
            >
              <div className="fk-repeater-item-header">
                <h3 id={`${id}-${index}-title`} className="fk-repeater-item-title">
                  {heading}
                </h3>
                <Button
                  className="fk-button fk-button-link"
                  aria-label={format(messages.removeItem, { item: heading })}
                  onPress={() => controller.removeItem(path, index)}
                >
                  {messages.remove}
                </Button>
              </div>
              {element.elements.map((child) => renderElement(child, `${path}.${index}.`))}
            </div>
          );
        })}
        <Button
          className="fk-button fk-button-secondary"
          isDisabled={full}
          onPress={() => {
            controller.addItem(path);
            setPendingFocus(`${path}.${items.length}`);
          }}
        >
          {format(messages.addItem, { item: itemLabel })}
        </Button>
      </fieldset>
    );
  };

  const renderField = (field: Field, path: string): ReactNode => {
    if (field.type === "hidden") return null;
    const Component = components[field.type];
    const errors = controller.errorsAt(path);
    return (
      <div key={path} className="fk-field-wrapper" data-fk-path={path}>
        <Component
          field={field}
          path={path}
          id={domId(form.key, path)}
          label={text(field.label) ?? field.key}
          description={text(field.description)}
          placeholder={"placeholder" in field ? text(field.placeholder) : undefined}
          value={valueAt(path)}
          onChange={(value) => controller.setValue(path, value)}
          onBlur={() => controller.touch(path)}
          errorMessages={errors.map((error) => describeError(error))}
          fieldErrorMessages={errors
            .filter((error) => error.path === path)
            .map((error) => describeError(error))}
          errorsAt={(member) =>
            errors
              .filter((error) => error.path === `${path}.${member}`)
              .map((error) => describeError(error))
          }
          isInvalid={errors.length > 0}
          isRequired={controller.isRequired(path)}
          isReadOnly={controller.isReadOnly(path)}
          locale={locale}
          messages={messages}
          text={text}
          {...(props.uploadFile && { uploadFile: props.uploadFile })}
        />
      </div>
    );
  };

  /** Label of a member below a field: a name or address part, or a file name. */
  const memberLabel = (element: Element | ItemElement, fieldPath: string, member: string) => {
    if (element.type === "name") return messages.nameParts[member as keyof Messages["nameParts"]];
    if (element.type === "address")
      return messages.addressParts[member as keyof Messages["addressParts"]];
    if (element.type === "file") {
      const files = valueAt(fieldPath);
      const file = Array.isArray(files) ? files[Number(member)] : undefined;
      return file && typeof file === "object" && !Array.isArray(file)
        ? String(file.name)
        : undefined;
    }
    return undefined;
  };

  /** A readable label for an error path, for example "Full name – Last name". */
  const labelOf = (path: string) => {
    const segments = path.split(".");
    const top = allElements.find((element) => element.key === segments[0]);
    if (!top) return undefined;
    const parts: (string | undefined)[] = [];
    let field: Element | ItemElement = top;
    let fieldPath = segments[0]!;
    let rest = segments.slice(1);
    if (top.type === "repeater" && rest.length >= 2) {
      const itemLabel = text(top.itemLabel) ?? text(top.label) ?? top.key;
      parts.push(format(messages.itemHeading, { item: itemLabel, index: Number(rest[0]) + 1 }));
      const child = allElements.find((element) => element.key === rest[1] && element !== top);
      if (!child) return parts.join(" – ");
      field = child;
      fieldPath = segments.slice(0, 3).join(".");
      rest = rest.slice(2);
    }
    parts.push("label" in field ? text(field.label) : undefined);
    if (rest.length > 0) parts.push(memberLabel(field, fieldPath, rest[0]!));
    return parts.filter(Boolean).join(" – ");
  };

  return (
    <I18nProvider locale={locale}>
      <div ref={rootRef} className={["fk-form", props.className].filter(Boolean).join(" ")}>
        {!single && state.pages.length > 1 && (
          <p className="fk-progress">
            {format(messages.progress, { current: pageIndex + 1, total: state.pages.length })}
          </p>
        )}
        {showSummary && summaryErrors.length > 0 && (
          <div ref={summaryRef} className="fk-error-summary" role="alert" tabIndex={-1}>
            <h2 className="fk-error-summary-title">{messages.errorSummaryTitle}</h2>
            <ul>
              {summaryErrors.map((error) => (
                <li key={`${error.path} ${error.code}`}>
                  <a
                    href={`#${domId(form.key, error.path)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      focusField(error.path);
                    }}
                  >
                    {[labelOf(error.path), describeError(error)].filter(Boolean).join(": ")}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (single || state.isLastPage) void onSubmit();
            else onNext();
          }}
        >
          {pages.map((page) => (
            <section
              key={page.key}
              className="fk-page"
              aria-labelledby={`${domId(form.key, page.key)}-title`}
            >
              {(text(page.title) ?? (!single && text(form.title))) && (
                <h2
                  id={`${domId(form.key, page.key)}-title`}
                  className="fk-page-title"
                  tabIndex={-1}
                >
                  {text(page.title) ?? text(form.title)}
                </h2>
              )}
              {text(page.description) && (
                <p className="fk-page-description">{text(page.description)}</p>
              )}
              {page.elements.map((element) => renderElement(element, ""))}
            </section>
          ))}
          {submitError && (
            <p className="fk-submit-error" role="alert">
              {messages.submitFailed}
            </p>
          )}
          <div className="fk-actions">
            {!single && !state.isFirstPage && (
              <Button className="fk-button fk-button-secondary" onPress={() => controller.back()}>
                {messages.back}
              </Button>
            )}
            <Button
              type="submit"
              className="fk-button fk-button-primary"
              isDisabled={state.status === "submitting"}
            >
              {state.status === "submitting"
                ? messages.submitting
                : single || state.isLastPage
                  ? messages.submit
                  : messages.next}
            </Button>
          </div>
        </form>
      </div>
    </I18nProvider>
  );
}

function Content({
  element,
  text,
}: {
  element: ContentElement;
  text: (value: Text | undefined) => string | undefined;
}) {
  const source = text(element.text) ?? "";
  if (element.format === "markdown") {
    return (
      <div className="fk-content">
        <Markdown source={source} />
      </div>
    );
  }
  return (
    <div className="fk-content">
      {source.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

function Panel({
  element,
  text,
  renderChild,
}: {
  element: PanelElement<Element> | PanelElement<ItemElement>;
  text: (value: Text | undefined) => string | undefined;
  renderChild: (child: Element | ItemElement) => ReactNode;
}) {
  const title = text(element.title);
  return (
    <fieldset className="fk-panel">
      {title && <legend className="fk-panel-title">{title}</legend>}
      {text(element.description) && <p className="fk-description">{text(element.description)}</p>}
      {(element.elements as (Element | ItemElement)[]).map(renderChild)}
    </fieldset>
  );
}
