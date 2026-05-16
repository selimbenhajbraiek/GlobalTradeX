"use client";

import { TradeAnalyticsPage } from "@/components/analytics/TradeAnalyticsPage";
import RoleGuard from "@/components/RoleGuard";

export default function AdminAnalyticsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <TradeAnalyticsPage />
    </RoleGuard>
  );
}
