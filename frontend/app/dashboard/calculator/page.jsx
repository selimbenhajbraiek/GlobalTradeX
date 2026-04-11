"use client";

import { useState } from "react";

import { calculatorApi } from "@/lib/api";

export default function CalculatorPage() {
  const [dutyForm, setDutyForm] = useState({
    hs_code: "",
    declared_value: 0,
    origin_country: "",
    destination_country: "",
  });
  const [freightForm, setFreightForm] = useState({
    weight_kg: 1,
    origin: "",
    destination: "",
    mode: "sea",
  });
  const [dutyResult, setDutyResult] = useState(null);
  const [freightResult, setFreightResult] = useState(null);
  const [busy, setBusy] = useState("");

  async function runDuties(e) {
    e.preventDefault();
    setBusy("duty");
    try {
      const { data } = await calculatorApi.duties({
        ...dutyForm,
        declared_value: Number(dutyForm.declared_value),
      });
      setDutyResult(data);
    } finally {
      setBusy("");
    }
  }

  async function runFreight(e) {
    e.preventDefault();
    setBusy("freight");
    try {
      const { data } = await calculatorApi.freight({
        ...freightForm,
        weight_kg: Number(freightForm.weight_kg),
      });
      setFreightResult(data);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--text)]">Calculateur</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Estimations douanières et fret (placeholders backend — à remplacer par vos tarifs / APIs).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={runDuties} className="glass space-y-4 rounded-2xl p-6 shadow-lift">
          <h2 className="font-display text-lg font-semibold text-[var(--text)]">Droits & taxes</h2>
          <div>
            <label className="text-xs text-mist">HS code</label>
            <input
              className="input-field mt-1"
              value={dutyForm.hs_code}
              onChange={(e) => setDutyForm((f) => ({ ...f, hs_code: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-mist">Valeur déclarée</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-field mt-1"
              value={dutyForm.declared_value}
              onChange={(e) => setDutyForm((f) => ({ ...f, declared_value: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-mist">Origine (pays)</label>
              <input
                className="input-field mt-1"
                value={dutyForm.origin_country}
                onChange={(e) => setDutyForm((f) => ({ ...f, origin_country: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-mist">Destination</label>
              <input
                className="input-field mt-1"
                value={dutyForm.destination_country}
                onChange={(e) => setDutyForm((f) => ({ ...f, destination_country: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={busy === "duty"}>
            {busy === "duty" ? "Calcul…" : "Estimer les droits"}
          </button>
          {dutyResult ? (
            <pre className="overflow-auto rounded-lg border border-line bg-rail/60 p-3 text-xs text-mist">
              {JSON.stringify(dutyResult, null, 2)}
            </pre>
          ) : null}
        </form>

        <form onSubmit={runFreight} className="glass space-y-4 rounded-2xl p-6 shadow-lift">
          <h2 className="font-display text-lg font-semibold text-[var(--text)]">Fret</h2>
          <div>
            <label className="text-xs text-mist">Poids (kg)</label>
            <input
              type="number"
              min={0.01}
              step="0.1"
              className="input-field mt-1"
              value={freightForm.weight_kg}
              onChange={(e) => setFreightForm((f) => ({ ...f, weight_kg: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-mist">Origine</label>
              <input
                className="input-field mt-1"
                value={freightForm.origin}
                onChange={(e) => setFreightForm((f) => ({ ...f, origin: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-mist">Destination</label>
              <input
                className="input-field mt-1"
                value={freightForm.destination}
                onChange={(e) => setFreightForm((f) => ({ ...f, destination: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-mist">Mode</label>
            <select
              className="input-field mt-1"
              value={freightForm.mode}
              onChange={(e) => setFreightForm((f) => ({ ...f, mode: e.target.value }))}
            >
              <option value="sea">sea</option>
              <option value="air">air</option>
              <option value="road">road</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={busy === "freight"}>
            {busy === "freight" ? "Calcul…" : "Estimer le fret"}
          </button>
          {freightResult ? (
            <pre className="overflow-auto rounded-lg border border-line bg-rail/60 p-3 text-xs text-mist">
              {JSON.stringify(freightResult, null, 2)}
            </pre>
          ) : null}
        </form>
      </div>
    </div>
  );
}
