# @formkiln/react

React renderer for [Formkiln](https://github.com/liuyfly/formkiln) forms, built on `@formkiln/core` and [React Aria Components](https://react-spectrum.adobe.com/react-aria/) for accessible, localised controls.

```bash
npm install @formkiln/react
```

```tsx
import "@formkiln/react/styles.css"; // optional default theme
import { KilnForm } from "@formkiln/react";

<KilnForm
  form={formDocument}
  initialAnswers={draft}
  locale="en"
  onChange={(answers) => saveDraft(answers)}
  onValidationError={(errors) => log(errors)}
  onSubmit={async ({ submission, outcome }) => {
    await api.submit(submission);
  }}
/>;
```

- The renderer never makes network requests: loading, drafts and submission belong to the host.
- Replace the component of any field type with `components={{ text: MyTextField }}`. Components receive `FieldProps`.
- Override interface strings with `messages`. English and Simplified Chinese are built in.
- Theme with CSS custom properties such as `--fk-accent`, `--fk-radius` and `--fk-font`, set on `.fk-form` and `.fk-popover`.
- File fields upload through the host: pass `uploadFile={(file, { field, path }) => Promise<FileRef>}`. Without it, file fields are disabled.
- Content with `format: "markdown"` renders a safe subset (emphasis, links, lists). HTML is never interpreted.

Every field type of Form Schema v1 is supported, including name and address parts, repeaters with add and remove, and file uploads. Tests run axe-core on every page of the example form, including error states.

## License

Apache-2.0
