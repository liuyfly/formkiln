import type { Metadata } from "next";
import { Suspense } from "react";
import { FormsView } from "./FormsView";

export const metadata: Metadata = { title: "Forms" };

export default function FormsPage() {
  // FormsView reads the folder and the archived view from the URL.
  return (
    <Suspense>
      <FormsView />
    </Suspense>
  );
}
