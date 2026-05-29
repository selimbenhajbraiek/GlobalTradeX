"use client";

import Link from "next/link";

import { PredictiveBiPanel } from "@/components/analytics/PredictiveBiPanel";
import RoleGuard from "@/components/RoleGuard";

export default function TransitairePredictivePage() {
  return (
    <RoleGuard allowedRoles={["transitaire", "admin"]}>
      <div className="space-y-6">
        <Link
          href="/dashboard/transitaire"
          className="text-sm font-medium text-kinetic hover:underline"
        >
          ← Retour au cockpit transitaire
        </Link>
        <PredictiveBiPanel />
      </div>
    </RoleGuard>
  );
}
