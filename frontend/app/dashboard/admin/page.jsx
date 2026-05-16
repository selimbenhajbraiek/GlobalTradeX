"use client";

import { AdminOverview } from "@/components/app/AdminOverview";
import RoleGuard from "@/components/RoleGuard";

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminOverview />
    </RoleGuard>
  );
}
