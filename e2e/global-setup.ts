import { publish, readForm } from "./lib/api";
import { API_URL } from "./lib/env";
import { largeForm } from "./lib/large-form";

/** Waits for the server and publishes the test forms (each run adds a version). */
export default async function globalSetup(): Promise<void> {
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      if ((await fetch(`${API_URL}/actuator/health/readiness`)).ok) break;
    } catch {
      // Not up yet.
    }
    if (Date.now() > deadline) throw new Error(`The server at ${API_URL} did not become ready`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await publish(readForm("../forms/contact.json"));
  await publish(readForm("../../packages/spec/examples/rental-application.json"));
  await publish(largeForm(300));
}
