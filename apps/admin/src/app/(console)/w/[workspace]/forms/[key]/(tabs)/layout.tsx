import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isFormKey } from "../../../../../../../lib/api";
import { FormTabs } from "./FormTabs";

export default async function FormLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isFormKey(key)) notFound();
  return (
    <>
      <FormTabs formKey={key} />
      {children}
    </>
  );
}
