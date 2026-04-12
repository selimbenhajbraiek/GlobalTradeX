"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plane, Ship, Train, Truck } from "lucide-react";

import RoleGuard from "@/components/RoleGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { aiApi, productsApi, shipmentsApi } from "@/lib/api";

const STEPS = ["Route", "Cargo & AI", "Products", "Review"];

const CARGO_TYPES = ["general", "fragile", "dangerous", "perishable", "oversized"];

const TRANSPORT_MODES = ["air", "sea", "road", "rail"];

const CURRENCIES = ["USD", "EUR", "GBP", "TND"];

function normalizeRole(role) {
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && "value" in role) return String(role.value);
  return "";
}

function dashboardHomeForRole(role) {
  const r = normalizeRole(role);
  const map = {
    admin: "/dashboard/admin",
    importateur: "/dashboard/importateur",
    exportateur: "/dashboard/exportateur",
    transitaire: "/dashboard/transitaire",
    courtier: "/dashboard/courtier",
  };
  return map[r] || "/dashboard";
}

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (typeof d?.error?.message === "string") return d.error.message;
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x) => x?.msg || x).join(", ");
  }
  return err?.message || "Something went wrong.";
}

function riskBadgeClass(level) {
  const s = String(level || "").toLowerCase();
  if (s === "high") return "bg-red-100 text-red-900 ring-red-200";
  if (s === "medium") return "bg-amber-100 text-amber-900 ring-amber-200";
  return "bg-emerald-100 text-emerald-900 ring-emerald-200";
}

function ModeIcon({ mode }) {
  const m = String(mode || "").toLowerCase();
  const cls = "h-5 w-5 shrink-0";
  if (m === "air") return <Plane className={cls} aria-hidden />;
  if (m === "sea") return <Ship className={cls} aria-hidden />;
  if (m === "rail") return <Train className={cls} aria-hidden />;
  return <Truck className={cls} aria-hidden />;
}

function formatMoneyUsd(n) {
  if (n == null || n === "") return "—";
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(x);
}

function NewShipmentForm() {
  const router = useRouter();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const canLinkProducts = role === "exportateur";

  const exporterTheme = role === "exportateur";

  const [step, setStep] = useState(1);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [cargoType, setCargoType] = useState("general");
  const [transportMode, setTransportMode] = useState("sea");

  const [weightKg, setWeightKg] = useState("");
  const [volumeM3, setVolumeM3] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [urgency, setUrgency] = useState("normal");

  const [freightEstimateUsd, setFreightEstimateUsd] = useState("");
  const [selectedRouteLabel, setSelectedRouteLabel] = useState("");

  const [routeSuggestions, setRouteSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);

  const [catalog, setCatalog] = useState([]);
  const [productQty, setProductQty] = useState({});

  const loadProducts = useCallback(async () => {
    if (!canLinkProducts) return;
    try {
      const { data } = await productsApi.getAll({ page: 1, limit: 500 });
      const items = data?.items ?? data ?? [];
      setCatalog(Array.isArray(items) ? items : []);
    } catch {
      setCatalog([]);
    }
  }, [canLinkProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const progressPercent = useMemo(() => (step / STEPS.length) * 100, [step]);

  function validateStep1() {
    if (!origin.trim() || !destination.trim()) {
      return "Origin and destination are required.";
    }
    if (!departureDate) {
      return "Departure date is required.";
    }
    if (!transportMode) {
      return "Transport mode is required.";
    }
    return null;
  }

  function validateStep2() {
    if (weightKg === "" || Number.isNaN(Number(weightKg)) || Number(weightKg) < 0) {
      return "Enter a valid weight (kg).";
    }
    if (volumeM3 === "" || Number.isNaN(Number(volumeM3)) || Number(volumeM3) < 0) {
      return "Enter a valid volume (m³).";
    }
    if (estimatedValue === "" || Number.isNaN(Number(estimatedValue)) || Number(estimatedValue) < 0) {
      return "Enter a valid estimated value.";
    }
    if (!currency) {
      return "Currency is required.";
    }
    return null;
  }

  function goNext() {
    setSubmitError("");
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setSubmitError(err);
        return;
      }
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) {
        setSubmitError(err);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function goBack() {
    setSubmitError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function fetchRouteSuggestions() {
    setAiError("");
    const w = Number(weightKg);
    if (weightKg === "" || Number.isNaN(w) || w < 0) {
      setAiError("Enter a valid weight (kg) before requesting AI routes.");
      return;
    }
    setAiLoading(true);
    setRouteSuggestions([]);
    try {
      const { data } = await aiApi.suggestRoutes({
        origin: origin.trim(),
        destination: destination.trim(),
        cargo_type: cargoType,
        weight_kg: w,
        urgency,
      });
      const routes = Array.isArray(data?.routes) ? data.routes : [];
      setRouteSuggestions(routes.slice(0, 3));
    } catch (err) {
      setAiError(apiErrorMessage(err));
    } finally {
      setAiLoading(false);
    }
  }

  function selectRouteCard(r) {
    const mode = String(r.mode || "").toLowerCase();
    if (["air", "sea", "road", "rail"].includes(mode)) {
      setTransportMode(mode);
    }
    if (r.cost_usd != null && !Number.isNaN(Number(r.cost_usd))) {
      setFreightEstimateUsd(String(r.cost_usd));
    }
    setSelectedRouteLabel(r.carrier ? `${r.carrier} (${mode})` : mode);
  }

  function toggleProduct(id, checked) {
    setProductQty((prev) => {
      const next = { ...prev };
      if (checked) {
        next[id] = prev[id] && prev[id] > 0 ? prev[id] : 1;
      } else {
        delete next[id];
      }
      return next;
    });
  }

  function setQty(id, raw) {
    const q = parseInt(raw, 10);
    setProductQty((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(q) || q < 1) {
        delete next[id];
      } else {
        next[id] = q;
      }
      return next;
    });
  }

  async function onSubmit() {
    setSubmitError("");
    const e1 = validateStep1();
    const e2 = validateStep2();
    if (e1 || e2) {
      setSubmitError(e1 || e2);
      return;
    }
    setPending(true);
    try {
      const product_items =
        role === "exportateur"
          ? Object.entries(productQty)
              .filter(([, q]) => q >= 1)
              .map(([product_id, quantity]) => ({
                product_id: parseInt(product_id, 10),
                quantity: parseInt(quantity, 10),
              }))
          : [];

      const payload = {
        origin: origin.trim(),
        destination: destination.trim(),
        cargo_type: cargoType,
        transport_mode: transportMode,
        status: "pending",
        weight_kg: Number(weightKg),
        volume_m3: Number(volumeM3),
        estimated_value: Number(estimatedValue),
        currency,
        freight_estimate_usd:
          freightEstimateUsd === "" || freightEstimateUsd == null
            ? null
            : Number(freightEstimateUsd),
        departure_date: departureDate || null,
        notes: selectedRouteLabel ? `Selected route: ${selectedRouteLabel}` : null,
        product_items,
      };
      await shipmentsApi.create(payload);
      sessionStorage.setItem("gtx_shipment_created_toast", "Shipment created successfully.");
      router.push(dashboardHomeForRole(user?.role));
    } catch (err) {
      setSubmitError(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const shellClass = exporterTheme
    ? "rounded-2xl border-2 border-green-500 bg-green-50 p-6 shadow-sm"
    : "glass space-y-6 rounded-2xl p-6 shadow-lift";

  const labelClass = exporterTheme ? "text-xs font-medium text-slate-700" : "text-xs font-medium text-mist";
  const inputClass = exporterTheme
    ? "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
    : "input-field mt-1";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-mist">Shipments</p>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">New shipment</h1>
        <p className="mt-2 text-sm text-mist">
          Four-step flow: route, cargo &amp; AI routes, catalog (exporters), then review. Reference is generated as{" "}
          <code className="text-brass">GTX-YYYYMMDD-#####</code>.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-mist">
          <span>
            Step {step} of {STEPS.length}
          </span>
          <span className="font-medium text-[var(--text)]">{STEPS[step - 1]}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-rail/80">
          <div
            className={`h-full rounded-full transition-all duration-300 ${exporterTheme ? "bg-green-600" : "bg-brass"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-[10px] text-mist sm:text-xs">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={i + 1 === step ? "font-semibold text-[var(--text)]" : ""}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
      </div>

      <div className={shellClass}>
        {submitError || aiError ? (
          <p className="text-sm text-red-600" role="alert">
            {submitError || aiError}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Origin</label>
              <input
                className={inputClass}
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Sfax, Tunisia"
                autoComplete="shipping address-line1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Destination</label>
              <input
                className={inputClass}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Hamburg, Germany"
              />
            </div>
            <div>
              <label className={labelClass}>Departure date</label>
              <input
                type="date"
                className={inputClass}
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Cargo type</label>
              <select
                className={inputClass}
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value)}
              >
                {CARGO_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Transport mode</label>
              <select
                className={inputClass}
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
              >
                {TRANSPORT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Weight (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Volume (m³)</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  className={inputClass}
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Estimated value</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Urgency (for AI)</label>
                <select className={inputClass} value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="normal">normal</option>
                  <option value="express">express</option>
                </select>
              </div>
            </div>

            {freightEstimateUsd !== "" ? (
              <p className="text-sm text-slate-700">
                Freight estimate (USD): <strong>{formatMoneyUsd(freightEstimateUsd)}</strong>
              </p>
            ) : null}

            <div className="border-t border-slate-200 pt-4">
              <button
                type="button"
                className={
                  exporterTheme
                    ? "inline-flex items-center justify-center rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-60"
                    : "btn-primary"
                }
                disabled={aiLoading}
                onClick={fetchRouteSuggestions}
              >
                {aiLoading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner className="h-4 w-4 border-2 border-white/30 border-t-white" />
                    Getting suggestions…
                  </span>
                ) : (
                  "Get AI Route Suggestions"
                )}
              </button>

              {routeSuggestions.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {routeSuggestions.map((r, idx) => (
                    <button
                      key={`${r.carrier || "route"}-${idx}`}
                      type="button"
                      onClick={() => selectRouteCard(r)}
                      className={`rounded-xl border p-4 text-left text-sm transition ${
                        exporterTheme
                          ? "border-green-500 bg-white hover:bg-green-50"
                          : "border-line bg-panel/80 hover:border-brass/50 hover:bg-panel"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[var(--text)]">{r.carrier || "Carrier"}</p>
                        <ModeIcon mode={r.mode} />
                      </div>
                      <p className="mt-2 text-slate-600">
                        <span className="text-slate-500">Cost: </span>
                        {formatMoneyUsd(r.cost_usd)}
                      </p>
                      <p className="mt-1 text-slate-600">
                        <span className="text-slate-500">ETA: </span>
                        {r.eta_days != null ? `${r.eta_days} days` : "—"}
                      </p>
                      <p className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${riskBadgeClass(
                            r.risk_level
                          )}`}
                        >
                          {r.risk_level || "risk"}
                        </span>
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">{r.mode}</p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            {canLinkProducts ? (
              <>
                <p className="text-sm text-slate-700">
                  Select catalog products and quantities to attach to this shipment.
                </p>
                <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
                  {catalog.length === 0 ? (
                    <p className="text-sm text-slate-500">No products in your catalog yet.</p>
                  ) : (
                    catalog.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 px-3 py-2"
                      >
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={productQty[p.id] != null && productQty[p.id] >= 1}
                            onChange={(e) => toggleProduct(p.id, e.target.checked)}
                          />
                          <span className="font-medium text-slate-900">{p.name}</span>
                          <span className="text-slate-500">({p.hs_code})</span>
                        </label>
                        {productQty[p.id] != null && productQty[p.id] >= 1 ? (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-600">Qty</label>
                            <input
                              type="number"
                              min="1"
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                              value={productQty[p.id]}
                              onChange={(e) => setQty(p.id, e.target.value)}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-700">
                Catalog linking is only available when you create a shipment as an <strong>exporter</strong>. Continue to
                review.
              </p>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4 text-sm">
            <h2 className="text-base font-semibold text-[var(--text)]">Summary</h2>
            <dl className="grid gap-2 rounded-xl border border-slate-200 bg-white/80 p-4 sm:grid-cols-2">
              <div>
                <dt className={labelClass}>Origin</dt>
                <dd className="text-slate-900">{origin || "—"}</dd>
              </div>
              <div>
                <dt className={labelClass}>Destination</dt>
                <dd className="text-slate-900">{destination || "—"}</dd>
              </div>
              <div>
                <dt className={labelClass}>Departure</dt>
                <dd className="text-slate-900">{departureDate || "—"}</dd>
              </div>
              <div>
                <dt className={labelClass}>Cargo type</dt>
                <dd className="text-slate-900">{cargoType}</dd>
              </div>
              <div>
                <dt className={labelClass}>Transport mode</dt>
                <dd className="text-slate-900">{transportMode}</dd>
              </div>
              <div>
                <dt className={labelClass}>Weight / Volume</dt>
                <dd className="text-slate-900">
                  {weightKg || "—"} kg · {volumeM3 || "—"} m³
                </dd>
              </div>
              <div>
                <dt className={labelClass}>Estimated value</dt>
                <dd className="text-slate-900">
                  {estimatedValue || "—"} {currency}
                </dd>
              </div>
              <div>
                <dt className={labelClass}>Freight estimate (USD)</dt>
                <dd className="text-slate-900">{freightEstimateUsd ? formatMoneyUsd(freightEstimateUsd) : "—"}</dd>
              </div>
              {canLinkProducts ? (
                <div className="sm:col-span-2">
                  <dt className={labelClass}>Linked products</dt>
                  <dd className="text-slate-900">
                    {Object.keys(productQty).length === 0
                      ? "None"
                      : Object.entries(productQty)
                          .filter(([, q]) => q >= 1)
                          .map(([id, q]) => {
                            const p = catalog.find((x) => String(x.id) === String(id));
                            return `${p?.name || id} × ${q}`;
                          })
                          .join(", ")}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="text-xs text-mist">
              Submitting creates the shipment with status <code>pending</code> and notifies you by email (and SMS if your
              profile has a phone number).
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          {step > 1 ? (
            <button
              type="button"
              className={exporterTheme ? "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50" : "btn-ghost"}
              onClick={goBack}
              disabled={pending}
            >
              Back
            </button>
          ) : (
            <Link href="/dashboard/shipments" className={exporterTheme ? "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50" : "btn-ghost"}>
              Cancel
            </Link>
          )}
          {step < STEPS.length ? (
            <button
              type="button"
              className={
                exporterTheme
                  ? "rounded-xl bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800"
                  : "btn-primary"
              }
              onClick={goNext}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className={
                exporterTheme
                  ? "rounded-xl bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                  : "btn-primary"
              }
              disabled={pending}
              onClick={onSubmit}
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner className="h-4 w-4 border-2 border-white/30 border-t-white" />
                  Submitting…
                </span>
              ) : (
                "Submit shipment"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewShipmentPage() {
  return (
    <RoleGuard allowedRoles={["importateur", "exportateur", "admin"]}>
      <NewShipmentForm />
    </RoleGuard>
  );
}
