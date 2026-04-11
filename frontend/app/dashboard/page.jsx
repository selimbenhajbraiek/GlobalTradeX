"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";

const ROLE_PATHS = {
  admin: "/dashboard/admin",
  importateur: "/dashboard/importateur",
  exportateur: "/dashboard/exportateur",
  transitaire: "/dashboard/transitaire",
  courtier: "/dashboard/courtier",
};

const KNOWN_ROLES = new Set(Object.keys(ROLE_PATHS));

export default function DashboardHome() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const role = user.role;
    if (!KNOWN_ROLES.has(role)) {
      router.replace("/login");
      return;
    }
    router.replace(ROLE_PATHS[role]);
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return null;
}
