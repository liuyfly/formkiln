"use client";

import { AuditLog } from "../../../../../components/AuditLog";
import { useWorkspace } from "../../../../../lib/workspace";

export function AuditView() {
  const ws = useWorkspace();
  return (
    <AuditLog
      path={`${ws.admin}/audit`}
      description={`Changes to members, forms and settings of ${ws.name}, sensitive data access and exports. Sign-ins are in the instance log.`}
    />
  );
}
