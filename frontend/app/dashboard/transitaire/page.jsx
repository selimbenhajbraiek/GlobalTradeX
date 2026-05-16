"use client";

import RoleGuard from "@/components/RoleGuard";
import { TransitaireCockpit } from "@/components/roles/TransitaireCockpit";

export default function TransitairePage() {
  return (
    <RoleGuard allowedRoles={["transitaire", "admin"]}>
      <TransitaireCockpit />
    </RoleGuard>
  );
}
