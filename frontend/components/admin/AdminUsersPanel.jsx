"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { usersApi } from "@/lib/api";

const ACCENT = "#533AB7";
const ROLE_OPTIONS = ["admin", "importateur", "exportateur", "transitaire", "courtier"];

function roleBadgeClass(role) {
  const r = typeof role === "string" ? role : "";
  const map = {
    admin: "bg-[#533AB7] text-white",
    importateur: "bg-indigo-100 text-indigo-800",
    exportateur: "bg-emerald-100 text-emerald-800",
    transitaire: "bg-amber-100 text-amber-900",
    courtier: "bg-sky-100 text-sky-900",
  };
  return map[r] || "bg-gray-200 text-gray-800";
}

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x) => x?.msg || x).join(", ");
  }
  return err?.message || "Something went wrong.";
}

export function AdminUsersPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [draftRole, setDraftRole] = useState("");
  const [actionBusyId, setActionBusyId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await usersApi.list({ limit: 500, skip: 0 });
      setUsers(data || []);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const startEditRole = (u) => {
    setEditingUserId(u.id);
    setDraftRole(u.role);
  };

  const cancelEditRole = () => {
    setEditingUserId(null);
    setDraftRole("");
  };

  const saveRole = async (userId) => {
    setActionBusyId(userId);
    setError(null);
    try {
      const { data } = await usersApi.updateAdmin(userId, { role: draftRole });
      setUsers((prev) => prev.map((x) => (x.id === userId ? data : x)));
      cancelEditRole();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setActionBusyId(null);
    }
  };

  const deactivateUser = async (u) => {
    if (!u?.is_active) return;
    setActionBusyId(u.id);
    setError(null);
    try {
      const { data } = await usersApi.updateAdmin(u.id, { is_active: false });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? data : x)));
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 text-sm" style={{ color: ACCENT }}>
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          Loading users…
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 font-medium text-gray-700">Role</th>
              <th className="px-4 py-3 font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/80">
                <td className="whitespace-nowrap px-4 py-3 text-gray-900">{u.full_name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  {editingUserId === u.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={draftRole}
                        onChange={(e) => setDraftRole(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-[#533AB7] focus:ring-1 focus:ring-[#533AB7]"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={actionBusyId === u.id}
                        onClick={() => saveRole(u.id)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                        style={{ backgroundColor: ACCENT }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditRole}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadgeClass(u.role)}`}
                    >
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {u.is_active ? "active" : "inactive"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={editingUserId === u.id || u.id === user?.id}
                      onClick={() => startEditRole(u)}
                      className="rounded-lg border px-3 py-1 text-xs font-medium text-[#533AB7] hover:bg-[#EEEDFE] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit role
                    </button>
                    <button
                      type="button"
                      disabled={!u.is_active || actionBusyId === u.id || u.id === user?.id}
                      onClick={() => deactivateUser(u)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading ? (
          <p className="p-6 text-center text-sm text-gray-500">No users.</p>
        ) : null}
      </div>
    </div>
  );
}
