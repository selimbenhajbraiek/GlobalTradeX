"use client";

import { useCallback, useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { notificationsApi } from "@/lib/api";

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await notificationsApi.list({ limit: 100, unread_only: false });
      setItems(data || []);
    } catch {
      setError("Could not load notifications.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-600">Recent alerts for your account.</p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {items.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet.</li>
        ) : (
          items.map((n) => (
            <li key={n.id} className="px-4 py-4">
              <p className="font-medium text-gray-900">{n.title}</p>
              <p className="mt-1 text-sm text-gray-600">{n.message}</p>
              <p className="mt-2 text-xs text-gray-400">{formatWhen(n.created_at)}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
