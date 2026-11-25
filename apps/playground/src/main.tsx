import "@formkiln/react/styles.css";
import { KilnForm } from "@formkiln/react";
import type { FormDocument } from "@formkiln/spec";
import example from "@formkiln/spec/examples/rental-application.json";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

const form = example as unknown as FormDocument;

function Playground() {
  const [locale, setLocale] = useState("en");
  const [log, setLog] = useState<string[]>([]);
  const append = (line: string) => setLog((lines) => [line, ...lines].slice(0, 20));

  return (
    <main
      style={{
        display: "grid",
        gap: "2rem",
        padding: "2rem",
        gridTemplateColumns: "minmax(0, 40rem) 1fr",
      }}
    >
      <div>
        <label>
          Locale{" "}
          <select value={locale} onChange={(event) => setLocale(event.target.value)}>
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
          </select>
        </label>
        <KilnForm
          key={locale}
          form={form}
          locale={locale}
          onPageChange={(page) => append(`page: ${page}`)}
          onValidationError={(errors) =>
            append(`blocked: ${errors.map((e) => `${e.path} ${e.code}`).join(", ")}`)
          }
          onSubmit={({ submission, outcome }) =>
            append(`submitted (${outcome}): ${JSON.stringify(submission)}`)
          }
        />
      </div>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>{log.join("\n")}</pre>
    </main>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

createRoot(container).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);
