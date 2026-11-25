import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Builder } from "../../../../../builder/Builder";
import { isFormKey } from "../../../../../lib/api";

export const metadata: Metadata = { title: "Edit form" };

export default async function EditPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isFormKey(key)) notFound();
  return <Builder formKey={key} />;
}
