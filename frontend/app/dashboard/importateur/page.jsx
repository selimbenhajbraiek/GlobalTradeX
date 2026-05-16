"use client";

import RoleGuard from "@/components/RoleGuard";
import { ImporterCockpit } from "@/components/roles/ImporterCockpit";

export default function ImportateurPage() {
  return (
    <RoleGuard allowedRoles={["importateur", "admin"]}>
      <ImporterCockpit />
    </RoleGuard>
  );
}
