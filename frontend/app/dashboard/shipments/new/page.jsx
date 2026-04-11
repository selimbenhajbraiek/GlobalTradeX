"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import RoleGuard from "@/components/RoleGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { aiApi, shipmentsApi } from "@/lib/api";

const STEPS = ["Route details", "Cargo details", "Confirm & submit"];

function makeReference() {
  const base = `IMP-${Date.now().toString(36).toUpperCase()}`;
  return base.length > 50 ? base.slice(0, 50) : base;
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
  if (s.includes("high")) return "bg-red-500/15 text-red-200 ring-red-400/40";
  if (s.includes("medium")) return "bg-amber-500/15 text-amber-100 ring-amber-400/40";
  return "bg-emerald-500/15 text-emerald-100 ring-emerald-400/40";
}

function NewShipmentForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [cargoType, setCargoType] = useState("general");
  const [weightKg, setWeightKg] = useState("");
  const [volumeM3, setVolumeM3] = useState("");
  const [estimatedValueUsd, setEstimatedValueUsd] = useState("");
  const [transportMode, setTransportMode] = useState("sea");
  const [routeSuggestions, setRouteSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);

  const progressPercent = useMemo(() => (step / STEPS.length) * 100, [step]);

  function validateStep1() {
    if (!origin.trim() || !destination.trim()) {
      return "Origin and destination are required.";
    }
    if (!departureDate) {
      return "Departure date is required.";
    }
    return null;
  }

  function validateStep2() {
    if (!transportMode) {
      return "Transport mode is required.";
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
    setStep((s) => Math.min(s + 1, 3));
  }

  function goBack() {
    setSubmitError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function fetchRouteSuggestions() {
    setAiError("");
    setAiLoading(true);
    setRouteSuggestions([]);
    try {
      const cargoDescription = [
        `${cargoType} cargo`,
        weightKg ? `${weightKg} kg` : null,
        volumeM3 ? `${volumeM3} m³` : null,
      ]
        .filter(Boolean)
        .join(", ");
      const { data } = await aiApi.suggestRoutes({
        origin: origin.trim(),
        destination: destination.trim(),
        cargo_description: cargoDescription,
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
    const mode = String(r.transport_mode || r.mode || "").toLowerCase();
    if (["air", "sea", "road", "rail"].includes(mode)) {
      setTransportMode(mode);
    }
  }

  async function onSubmit() {
    setSubmitError("");
    setPending(true);
    try {
      const payload = {
        reference: makeReference(),
        origin: origin.trim(),
        destination: destination.trim(),
        cargo_type: cargoType,
        transport_mode: transportMode,
        status: "pending",
        weight_kg: weightKg === "" ? null : Number(weightKg),
        volume_m3: volumeM3 === "" ? null : Number(volumeM3),
        estimated_value: estimatedValueUsd === "" ? null : Number(estimatedValueUsd),
        departure_date: departureDate || null,
        notes: null,
      };
      await shipmentsApi.create(payload);
      sessionStorage.setItem(
        "gtx_shipment_created_toast",
        "Shipment created successfully."
      );
      router.push("/dashboard/importateur");
    } catch (err) {
      setSubmitError(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-mist">Shipments</p>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">New shipment</h1>
        <p className="mt-2 text-sm text-mist">Multi-step flow for importers. Fields match the API shipment schema.</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-mist">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={i + 1 === step ? "font-semibold text-[var(--text)]" : ""}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-rail/80">
          <div
            className="h-full rounded-full bg-brass transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="glass space-y-6 rounded-2xl p-6 shadow-lift">
        {submitError || aiError ? (
          <p className="text-sm text-red-300" role="alert">
            {submitError || aiError}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-mist">Origin country</label>
              <input
                className="input-field mt-1"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. China"
                autoComplete="shipping country"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-mist">Destination country</label>
              <input
                className="input-field mt-1"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. France"
                autoComplete="shipping country"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-mist">Departure date</label>
              <input
                type="date"
                className="input-field mt-1"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-mist">Cargo type</label>
              <select
                className="input-field mt-1"
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value)}
              >
                <option value="general">general</option>
                <option value="fragile">fragile</option>
                <option value="dangerous">dangerous</option>
                <option value="perishable">perishable</option>
              </select>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-mist">Weight (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field mt-1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-mist">Volume (m³)</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  className="input-field mt-1"
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-mist">Estimated value (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field mt-1"
                  value={estimatedValueUsd}
                  onChange={(e) => setEstimatedValueUsd(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-mist">Transport mode</label>
                <select
                  className="input-field mt-1"
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value)}
                >
                  <option value="air">air</option>
                  <option value="sea">sea</option>
                  <option value="road">road</option>
                  <option value="rail">rail</option>
                </select>
              </div>
            </div>

            <div className="border-t border-line/80 pt-4">
              <button
                type="button"
                className="btn-primary"
                disabled={aiLoading}
                onClick={fetchRouteSuggestions}
              >
                {aiLoading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner className="h-4 w-4 border-2 border-ink/30 border-t-ink" />
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
                      className="rounded-xl border border-line bg-panel/80 p-4 text-left text-sm transition hover:border-brass/50 hover:bg-panel"
                    >
                      <p className="font-semibold text-[var(--text)]">{r.carrier || "Carrier"}</p>
                      <p className="mt-2 text-mist">
                        <span className="text-mist/80">Cost: </span>
                        {r.estimated_cost || "—"}
                      </p>
                      <p className="mt-1 text-mist">
                        <span className="text-mist/80">ETA: </span>
                        {r.eta || "—"}
                      </p>
                      <p className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${riskBadgeClass(
                            r.risk_level
                          )}`}
                        >
                          {r.risk_level || "Risk"}
                        </span>
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-brass/90">
                        {r.transport_mode || r.mode || ""}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4 text-sm">
            <h2 className="text-base font-semibold text-[var(--text)]">Summary</h2>
            <dl className="grid gap-2 rounded-xl border border-line/80 bg-rail/40 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-mist">Origin</dt>
                <dd className="text-[var(--text)]">{origin || "—"}</dd>
              </div>
              <div>
                <dt className="text-mist">Destination</dt>
                <dd className="text-[var(--text)]">{destination || "—"}</dd>
              </div>
              <div>
                <dt className="text-mist">Departure</dt>
                <dd className="text-[var(--text)]">{departureDate || "—"}</dd>
              </div>
              <div>
                <dt className="text-mist">Cargo type</dt>
                <dd className="text-[var(--text)]">{cargoType}</dd>
              </div>
              <div>
                <dt className="text-mist">Weight (kg)</dt>
                <dd className="text-[var(--text)]">{weightKg || "—"}</dd>
              </div>
              <div>
                <dt className="text-mist">Volume (m³)</dt>
                <dd className="text-[var(--text)]">{volumeM3 || "—"}</dd>
              </div>
              <div>
                <dt className="text-mist">Est. value (USD)</dt>
                <dd className="text-[var(--text)]">{estimatedValueUsd || "—"}</dd>
              </div>
              <div>
                <dt className="text-mist">Transport mode</dt>
                <dd className="text-[var(--text)]">{transportMode}</dd>
              </div>
            </dl>
            <p className="text-xs text-mist">
              A unique reference will be generated on submit. Status will be set to <code>pending</code>.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          {step > 1 ? (
            <button type="button" className="btn-ghost" onClick={goBack} disabled={pending}>
              Back
            </button>
          ) : (
            <Link href="/dashboard/shipments" className="btn-ghost">
              Cancel
            </Link>
          )}
          {step < 3 ? (
            <button type="button" className="btn-primary" onClick={goNext}>
              Next
            </button>
          ) : (
            <button type="button" className="btn-primary" disabled={pending} onClick={onSubmit}>
              {pending ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner className="h-4 w-4 border-2 border-ink/30 border-t-ink" />
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
    <RoleGuard allowedRoles={["importateur", "admin"]}>
      <NewShipmentForm />
    </RoleGuard>
  );
}
