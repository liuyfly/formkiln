import type { FormController, FormControllerOptions, SubmitHandler } from "@formkiln/core";
import type {
  ContentElement,
  Element,
  Field,
  FormDocument,
  JsonValue,
  Page,
  PanelElement,
  Text,
  ValidationError,
} from "@formkiln/spec";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, I18nProvider } from "react-aria-components";
import { defaultComponents } from "./fields/fields";
import { defaultMessages, errorText, format, type Messages } from "./messages";
import { resolveText } from "./text";
import type { FieldComponents } from "./types";
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

const FOCUSABLE =
  'input, textarea, select, button, [role="spinbutton"], [tabindex]:not([tabindex="-1"])';

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

  const rootRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [focusTarget, setFocusTarget] = useState<"summary" | "page" | null>(null);

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
      const target = container?.querySelector<HTMLElement>(FOCUSABLE);
      if (target) {
        target.focus();
        return;
      }
      const cut = current.lastIndexOf(".");
      if (cut < 0) return;
      current = current.slice(0, cut);
    }
  };

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

  const renderElement = (element: Element, path: string): ReactNode => {
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
            renderChild={(child) => renderElement(child, child.key)}
          />
        );
      case "repeater":
        return (
          <div key={path} className="fk-field fk-unsupported" data-fk-path={path} role="note">
            <span className="fk-label">{text(element.label)}</span>
            <p>{messages.unsupported}</p>
          </div>
        );
      default:
        return renderField(element, path);
    }
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
          value={state.answers[path] ?? null}
          onChange={(value) => controller.setValue(path, value)}
          onBlur={() => controller.touch(path)}
          errorMessages={errors.map((error) => errorText(error, messages))}
          isInvalid={errors.length > 0}
          isRequired={controller.isRequired(path)}
          isReadOnly={controller.isReadOnly(path)}
          locale={locale}
          messages={messages}
          text={text}
        />
      </div>
    );
  };

  const labelOf = (path: string) => {
    const field = form.pages
      .flatMap(function collect(node: Page | Element): Element[] {
        const children = "elements" in node ? (node.elements as Element[]) : [];
        return [...(("type" in node ? [node] : []) as Element[]), ...children.flatMap(collect)];
      })
      .find((element) => element.key === path.split(".")[0]);
    return field && "label" in field ? text(field.label) : undefined;
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
                    {[labelOf(error.path), errorText(error, messages)].filter(Boolean).join(": ")}
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
              {page.elements.map((element) => renderElement(element, element.key))}
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
  const paragraphs = (text(element.text) ?? "").split(/\n{2,}/);
  return (
    <div className="fk-content">
      {paragraphs.map((paragraph, i) => (
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
  element: PanelElement;
  text: (value: Text | undefined) => string | undefined;
  renderChild: (child: Element) => ReactNode;
}) {
  const title = text(element.title);
  return (
    <fieldset className="fk-panel">
      {title && <legend className="fk-panel-title">{title}</legend>}
      {text(element.description) && <p className="fk-description">{text(element.description)}</p>}
      {element.elements.map(renderChild)}
    </fieldset>
  );
}
