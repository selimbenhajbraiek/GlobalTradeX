"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";

const ROLE_PATHS = {
  importateur: "/dashboard/importateur",
  exportateur: "/dashboard/exportateur",
  transitaire: "/dashboard/transitaire",
  courtier: "/dashboard/courtier",
  admin: "/dashboard/admin",
  user: "/dashboard/importateur",
};

export default function DashboardHome() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const path = ROLE_PATHS[user.role] || "/dashboard/importateur";
    router.replace(path);
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-mist">
        <LoadingSpinner />
        <p className="text-sm">Redirection selon votre rôle…</p>
      </div>
    </div>
  );
}
