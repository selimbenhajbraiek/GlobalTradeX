"use client";

import RoleGuard from "@/components/RoleGuard";
import { CustomsCockpit } from "@/components/roles/CustomsCockpit";

export default function CourtierPage() {
  return (
    <RoleGuard allowedRoles={["courtier", "admin"]}>
      <CustomsCockpit />
    </RoleGuard>
  );
}
