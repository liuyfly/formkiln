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

Name and address fields, file uploads, repeaters and Markdown content are coming next.

## License

Apache-2.0
