"use client";

import Link from "next/link";

import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import RoleGuard from "@/components/RoleGuard";

const ACCENT = "#533AB7";

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--text)]">User management</h1>
            <p className="mt-2 max-w-2xl text-sm text-mist">
              View accounts, change roles, and deactivate users (admin only).
            </p>
          </div>
          <Link
            href="/dashboard/admin"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-panel"
            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
          >
            ← Admin overview
          </Link>
        </div>
        <AdminUsersPanel />
      </div>
    </RoleGuard>
  );
}
