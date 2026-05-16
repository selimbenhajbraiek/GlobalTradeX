"use client";

import RoleGuard from "@/components/RoleGuard";
import { ExporterCockpit } from "@/components/roles/ExporterCockpit";

export default function ExportateurPage() {
  return (
    <RoleGuard allowedRoles={["exportateur", "admin"]}>
      <ExporterCockpit />
    </RoleGuard>
  );
}
