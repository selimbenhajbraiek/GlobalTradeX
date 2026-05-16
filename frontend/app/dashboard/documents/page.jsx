"use client";

import { DocumentsWorkspacePage } from "@/components/documents/DocumentsWorkspacePage";
import RoleGuard from "@/components/RoleGuard";

export default function DocumentsPage() {
  return (
    <RoleGuard allowedRoles={["exportateur", "importateur", "admin", "courtier"]}>
      <DocumentsWorkspacePage />
    </RoleGuard>
  );
}
