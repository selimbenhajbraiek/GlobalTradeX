"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";

export default function RoleGuard({ allowedRoles, children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
          aria-hidden
        />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  const role = typeof user.role === "string" ? user.role : "";
  const list = Array.isArray(allowedRoles) ? allowedRoles : [];

  if (!list.includes(role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="max-w-md text-lg text-gray-700">
          Access denied. Your role does not have permission to view this page.
        </p>
        <Link
          href={`/dashboard/${role || "importateur"}`}
          className="btn-primary inline-flex items-center justify-center"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return children;
}
