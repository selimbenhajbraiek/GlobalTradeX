"use client";

import { useCallback, useState } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";

const ROLE_LABELS = {
  admin: "Administrator",
  importateur: "Importer",
  exportateur: "Exporter",
  transitaire: "Freight forwarder",
  courtier: "Customs broker",
};

function roleLabel(role) {
  if (!role) return "—";
  return ROLE_LABELS[role] || role;
}

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-sm text-gray-600">
        You are not signed in. <a href="/login" className="text-blue-600 underline">Sign in</a>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">My profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Account details from your GlobalTradeX profile.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Full name</dt>
            <dd className="mt-0.5 text-gray-900">{user.full_name || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Email</dt>
            <dd className="mt-0.5 text-gray-900">{user.email || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Role</dt>
            <dd className="mt-0.5 text-gray-900">{roleLabel(user.role)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Account status</dt>
            <dd className="mt-0.5 text-gray-900">
              {user.is_active ? (
                <span className="font-medium text-emerald-700">Active</span>
              ) : (
                <span className="font-medium text-red-700">Inactive</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
          >
            {refreshing ? (
              <>
                <LoadingSpinner className="h-4 w-4 border-2 border-gray-300 border-t-gray-700" />
                Refreshing…
              </>
            ) : (
              "Refresh from server"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
