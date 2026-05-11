"use client";

import { AiAvatarSettings } from "@/components/admin/AiAvatarSettings";
import { AvatarAssistantSetup } from "@/components/admin/AvatarAssistantSetup";
import RoleGuard from "@/components/RoleGuard";

export default function AdminAssistantAvatarPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="mx-auto max-w-6xl space-y-6">
        <AiAvatarSettings />
        <AvatarAssistantSetup />
      </div>
    </RoleGuard>
  );
}
