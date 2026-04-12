"use client";

import { useMemo, useState } from "react";

import RoleGuard from "@/components/RoleGuard";
import { calculatorApi } from "@/lib/api";

const HS_CODE_INFO_URL = "https://www.trade.gov/harmonized-system-hs-codes";

function apiErrorMessage(err) {
  const d = err?.response?.data;
  if (typeof d?.detail === "string") return d.detail;
  if (typeof d?.error?.message === "string") return d.error.message;
  if (Array.isArray(d?.detail)) {
    return d.detail.map((x) => x?.msg || x).join(", ");
  }
  return err?.message || "Something went wrong.";
}

function formatUsd(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));
}

function formatPct(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${(Number(n) * 100).toFixed(2)}%`;
}

function CalculatorInner() {
  const [dutyForm, setDutyForm] = useState({
    hs_code: "",
    origin_country: "",
    destination_country: "",
    declared_value_usd: "",
  });
  const [freightForm, setFreightForm] = useState({
    weight_kg: "",
    length_cm: "",
    width_cm: "",
    height_cm: "",
    transport_mode: "sea",
  });

  const [dutyResult, setDutyResult] = useState(null);
  const [freightResult, setFreightResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const landedTotal = useMemo(() => {
    if (!dutyResult || freightResult == null) return null;
    const v = Number(dutyForm.declared_value_usd) || 0;
    const duty = Number(dutyResult.preferential_duty_usd) || 0;
    const vat = Number(dutyResult.vat_usd) || 0;
    const freight = Number(freightResult.cost_usd) || 0;
    return v + duty + vat + freight;
  }, [dutyResult, freightResult, dutyForm.declared_value_usd]);

  async function runDuties(e) {
    e.preventDefault();
    setBusy("duty");
    setError("");
    try {
      const { data } = await calculatorApi.duties({
        hs_code: dutyForm.hs_code.trim(),
        origin_country: dutyForm.origin_country.trim(),
        destination_country: dutyForm.destination_country.trim(),
        declared_value_usd: Number(dutyForm.declared_value_usd),
      });
      setDutyResult(data);
    } catch (err) {
      setError(apiErrorMessage(err));
      setDutyResult(null);
    } finally {
      setBusy("");
    }
  }

  async function runFreight(e) {
    e.preventDefault();
    setBusy("freight");
    setError("");
    try {
      const { data } = await calculatorApi.freight({
        weight_kg: Number(freightForm.weight_kg),
        length_cm: Number(freightForm.length_cm) || 0,
        width_cm: Number(freightForm.width_cm) || 0,
        height_cm: Number(freightForm.height_cm) || 0,
        transport_mode: freightForm.transport_mode,
      });
      setFreightResult(data);
    } catch (err) {
      setError(apiErrorMessage(err));
      setFreightResult(null);
    } finally {
      setBusy("");
    }
  }

  const panel = "rounded-2xl border-2 border-blue-500 bg-sky-50 p-6 shadow-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Duty &amp; freight calculator</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Estimate import duties (including EU-Tunisia preferential treatment) and freight before you order. Values are
          indicative — confirm with your customs broker.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Duty */}
        <div className={panel}>
          <h2 className="text-lg font-semibold text-blue-950">Duty calculator</h2>
          <form onSubmit={runDuties} className="mt-4 space-y-4">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label className="text-xs font-medium text-slate-700">HS code</label>
                <a
                  href={HS_CODE_INFO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-700 underline hover:text-blue-900"
                >
                  What is an HS code?
                </a>
              </div>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500/30 focus:ring-2"
                value={dutyForm.hs_code}
                onChange={(e) => setDutyForm((f) => ({ ...f, hs_code: e.target.value }))}
                placeholder="e.g. 1509.10"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Origin country</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                value={dutyForm.origin_country}
                onChange={(e) => setDutyForm((f) => ({ ...f, origin_country: e.target.value }))}
                placeholder="e.g. Tunisia"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Destination country</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                value={dutyForm.destination_country}
                onChange={(e) => setDutyForm((f) => ({ ...f, destination_country: e.target.value }))}
                placeholder="e.g. Germany"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Declared value (USD)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                value={dutyForm.declared_value_usd}
                onChange={(e) => setDutyForm((f) => ({ ...f, declared_value_usd: e.target.value }))}
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy === "duty"}
              className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
            >
              {busy === "duty" ? "Calculating…" : "Calculate duties"}
            </button>
          </form>

          {dutyResult ? (
            <div className="mt-6 rounded-xl border border-blue-200 bg-white p-4 shadow-inner">
              <h3 className="text-sm font-semibold text-slate-900">Results</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="py-2 pr-2 font-medium" />
                      <th className="py-2 pr-2 font-medium">Rate</th>
                      <th className="py-2 font-medium">Duty (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    <tr className="border-b border-slate-100">
                      <td className="py-2 font-medium">Standard</td>
                      <td className="py-2">{formatPct(dutyResult.standard_duty_rate)}</td>
                      <td className="py-2 tabular-nums">{formatUsd(dutyResult.standard_duty_usd)}</td>
                    </tr>
                    <tr className="bg-emerald-50/80">
                      <td className="py-2 font-medium text-emerald-900">Preferential</td>
                      <td className="py-2 font-semibold text-emerald-800">{formatPct(dutyResult.preferential_rate)}</td>
                      <td className="py-2 tabular-nums font-semibold text-emerald-900">
                        {formatUsd(dutyResult.preferential_duty_usd)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {dutyResult.note ? (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  {dutyResult.note}
                </p>
              ) : null}
              <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">VAT rate ({dutyForm.destination_country || "destination"})</dt>
                  <dd className="font-medium tabular-nums text-slate-900">{formatPct(dutyResult.vat_rate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">VAT (on value + preferential duty)</dt>
                  <dd className="font-medium tabular-nums text-slate-900">{formatUsd(dutyResult.vat_usd)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-dashed border-slate-200 pt-2">
                  <dt className="text-slate-600">Total (standard duty path)</dt>
                  <dd className="font-semibold tabular-nums">{formatUsd(dutyResult.total_standard)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-emerald-900">
                  <dt className="font-medium">Total (preferential duty path)</dt>
                  <dd className="font-bold tabular-nums">{formatUsd(dutyResult.total_preferential)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        {/* Freight */}
        <div className={panel}>
          <h2 className="text-lg font-semibold text-blue-950">Freight calculator</h2>
          <form onSubmit={runFreight} className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700">Weight (kg)</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                value={freightForm.weight_kg}
                onChange={(e) => setFreightForm((f) => ({ ...f, weight_kg: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Length (cm)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={freightForm.length_cm}
                  onChange={(e) => setFreightForm((f) => ({ ...f, length_cm: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Width (cm)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={freightForm.width_cm}
                  onChange={(e) => setFreightForm((f) => ({ ...f, width_cm: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Height (cm)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={freightForm.height_cm}
                  onChange={(e) => setFreightForm((f) => ({ ...f, height_cm: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Transport mode</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={freightForm.transport_mode}
                onChange={(e) => setFreightForm((f) => ({ ...f, transport_mode: e.target.value }))}
              >
                <option value="sea">Sea</option>
                <option value="air">Air</option>
                <option value="road">Road</option>
                <option value="rail">Rail</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={busy === "freight"}
              className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
            >
              {busy === "freight" ? "Calculating…" : "Calculate freight"}
            </button>
          </form>

          {freightResult ? (
            <div className="mt-6 rounded-xl border border-blue-200 bg-white p-4 shadow-inner">
              <h3 className="text-sm font-semibold text-slate-900">Results</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Volumetric weight</dt>
                  <dd className="tabular-nums font-medium">{freightResult.volumetric_weight_kg} kg</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Billable weight</dt>
                  <dd className="tabular-nums font-medium">{freightResult.billable_weight_kg} kg</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Rate</dt>
                  <dd className="tabular-nums">
                    {formatUsd(freightResult.rate_per_kg)} / kg ({freightResult.transport_mode})
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Estimated freight</dt>
                  <dd className="tabular-nums font-semibold text-slate-900">{formatUsd(freightResult.cost_usd)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
                  <dt className="text-slate-600">ETA</dt>
                  <dd className="font-medium">{freightResult.eta_days} days</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      </div>

      {/* Landed cost */}
      <div className="rounded-2xl border-2 border-blue-600 bg-gradient-to-br from-sky-100 to-blue-50 p-8 shadow-md">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-blue-900">Total landed cost</h2>
        <p className="mt-2 text-center text-xs text-slate-600">
          Declared value + preferential duty + VAT (preferential path) + freight estimate
        </p>
        {landedTotal != null ? (
          <p className="mt-6 text-center text-4xl font-bold tabular-nums tracking-tight text-blue-950">
            {formatUsd(landedTotal)}
          </p>
        ) : (
          <p className="mt-6 text-center text-sm text-slate-500">
            Run both calculators above to see your estimated landed cost.
          </p>
        )}
        {dutyResult && freightResult ? (
          <dl className="mx-auto mt-6 max-w-md space-y-1 text-sm text-slate-700">
            <div className="flex justify-between">
              <dt>Declared value</dt>
              <dd className="tabular-nums">{formatUsd(Number(dutyForm.declared_value_usd) || 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Preferential duty</dt>
              <dd className="tabular-nums">{formatUsd(dutyResult.preferential_duty_usd)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>VAT</dt>
              <dd className="tabular-nums">{formatUsd(dutyResult.vat_usd)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Freight</dt>
              <dd className="tabular-nums">{formatUsd(freightResult.cost_usd)}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <RoleGuard allowedRoles={["importateur", "admin"]}>
      <CalculatorInner />
    </RoleGuard>
  );
}
