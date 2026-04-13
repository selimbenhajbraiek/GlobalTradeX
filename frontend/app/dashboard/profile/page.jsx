"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";

function normalizeRole(role) {
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && "value" in role) return String(role.value);
  return "";
}

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth();
  const { t } = useLocale();
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
        {t("profile.notSignedIn")}{" "}
        <a href="/login" className="text-blue-600 underline">
          {t("profile.signIn")}
        </a>
      </p>
    );
  }

  const r = normalizeRole(user.role);
  const roleKey = `profile.roles.${r}`;
  const roleLabel = t(roleKey) === roleKey ? r || "—" : t(roleKey);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gray-900">{t("profile.title")}</h1>
          <p className="mt-1 text-sm text-gray-600">{t("profile.subtitle")}</p>
        </div>
        <Link
          href="/dashboard/settings"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
        >
          {t("profile.goToSettings")}
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">{t("profile.fullName")}</dt>
            <dd className="mt-0.5 text-gray-900">{user.full_name || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t("profile.email")}</dt>
            <dd className="mt-0.5 text-gray-900">{user.email || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t("profile.role")}</dt>
            <dd className="mt-0.5 text-gray-900">{roleLabel}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t("profile.accountStatus")}</dt>
            <dd className="mt-0.5 text-gray-900">
              {user.is_active ? (
                <span className="font-medium text-emerald-700">{t("profile.active")}</span>
              ) : (
                <span className="font-medium text-red-700">{t("profile.inactive")}</span>
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
                {t("profile.refreshing")}
              </>
            ) : (
              t("profile.refresh")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
