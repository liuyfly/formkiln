import type { Metadata } from "next";
import { SharingView } from "./SharingView";

export const metadata: Metadata = { title: "Sharing" };

export default async function SharingPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  // Public URL of the hosted fill-in site (apps/hosted), read at request time.
  const hostedUrl = (process.env.FORMKILN_HOSTED_URL ?? "http://localhost:3100").replace(
    /\/+$/,
    "",
  );
  return <SharingView formKey={key} hostedUrl={hostedUrl} />;
}
