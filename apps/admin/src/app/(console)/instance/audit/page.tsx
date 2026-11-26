import type { Metadata } from "next";
import { AuditLog } from "../../../../components/AuditLog";

export const metadata: Metadata = { title: "Instance audit log" };

export default function InstanceAuditPage() {
  return (
    <AuditLog
      path="/v1/admin/instance/audit"
      description="Everything recorded on this instance: sign-ins, account changes and the activity of every workspace."
      showWorkspace
    />
  );
}
