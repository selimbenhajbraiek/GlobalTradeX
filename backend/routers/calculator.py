from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from models.user import User

router = APIRouter()

# HS chapter/heading -> duty by destination market (EU vs rest)
DUTY_RATES: dict[str, dict[str, float]] = {
    "1509.10": {"EU": 0.12, "default": 0.15},  # olive oil
    "6204": {"EU": 0.12, "default": 0.20},  # clothing
    "8471": {"EU": 0.00, "default": 0.05},  # computers
    "default": {"EU": 0.05, "default": 0.10},
}

VAT_RATES: dict[str, float] = {
    "germany": 0.07,
    "france": 0.055,
    "default": 0.20,
}

EU_COUNTRIES: frozenset[str] = frozenset(
    {
        "austria",
        "belgium",
        "bulgaria",
        "croatia",
        "cyprus",
        "czech republic",
        "czechia",
        "denmark",
        "estonia",
        "finland",
        "france",
        "germany",
        "greece",
        "hungary",
        "ireland",
        "italy",
        "latvia",
        "lithuania",
        "luxembourg",
        "malta",
        "netherlands",
        "poland",
        "portugal",
        "romania",
        "slovakia",
        "slovenia",
        "spain",
        "sweden",
    }
)

FREIGHT_RATES_USD_PER_KG: dict[str, float] = {
    "air": 8.50,
    "sea": 0.38,
    "road": 2.20,
    "rail": 1.80,
}

FREIGHT_ETA_DAYS: dict[str, int] = {
    "air": 3,
    "sea": 18,
    "road": 7,
    "rail": 12,
}

VOLUMETRIC_DIVISOR = 5000.0


def _norm_country(s: str) -> str:
    return (s or "").strip().lower()


def _is_eu_destination(destination_country: str) -> bool:
    c = _norm_country(destination_country)
    return c in EU_COUNTRIES


def _is_tunisia_origin(origin_country: str) -> bool:
    return _norm_country(origin_country) in ("tunisia", "tn", "tunisie")


def _lookup_duty_row(hs_code: str) -> dict[str, float]:
    raw = (hs_code or "").strip().replace(" ", "")
    if not raw:
        return DUTY_RATES["default"]
    if raw in DUTY_RATES and raw != "default":
        return DUTY_RATES[raw]
    for key in ("1509.10", "6204", "8471"):
        if key in DUTY_RATES and raw.replace(".", "") == key.replace(".", ""):
            return DUTY_RATES[key]
    if raw.startswith("6204"):
        return DUTY_RATES["6204"]
    if raw.startswith("8471"):
        return DUTY_RATES["8471"]
    if raw.startswith("1509"):
        return DUTY_RATES["1509.10"]
    return DUTY_RATES["default"]


def _standard_duty_rate_fraction(destination_country: str, row: dict[str, float]) -> float:
    return row["EU"] if _is_eu_destination(destination_country) else row["default"]


def _vat_rate_fraction(destination_country: str) -> float:
    c = _norm_country(destination_country)
    return VAT_RATES.get(c, VAT_RATES["default"])


class DutyRequest(BaseModel):
    hs_code: str = Field(..., min_length=1, max_length=32)
    origin_country: str = Field(default="", max_length=100)
    destination_country: str = Field(default="", max_length=100)
    declared_value_usd: float = Field(ge=0)


class DutyResponse(BaseModel):
    standard_duty_rate: float
    standard_duty_usd: float
    preferential_rate: float
    preferential_duty_usd: float
    vat_rate: float
    vat_usd: float
    total_standard: float
    total_preferential: float
    note: str


class FreightRequest(BaseModel):
    weight_kg: float = Field(gt=0)
    length_cm: float = Field(ge=0)
    width_cm: float = Field(ge=0)
    height_cm: float = Field(ge=0)
    transport_mode: str = Field(default="sea", pattern="^(air|sea|road|rail)$")


class FreightResponse(BaseModel):
    volumetric_weight_kg: float
    billable_weight_kg: float
    cost_usd: float
    eta_days: int
    transport_mode: str
    rate_per_kg: float


def _money(x: float) -> float:
    return float(Decimal(str(x)).quantize(Decimal("0.01")))


@router.post("/duties", response_model=DutyResponse)
def estimate_duties(
    payload: DutyRequest,
    _: User = Depends(get_current_user),
) -> DutyResponse:
    value = float(payload.declared_value_usd)
    row = _lookup_duty_row(payload.hs_code)
    std_rate = _standard_duty_rate_fraction(payload.destination_country, row)
    standard_duty_usd = _money(value * std_rate)

    tunisia_eu = _is_tunisia_origin(payload.origin_country) and _is_eu_destination(payload.destination_country)
    if tunisia_eu:
        pref_rate = 0.0
        preferential_duty_usd = 0.0
        note = "Preferential rate applies with valid Certificate of Origin"
    else:
        pref_rate = std_rate
        preferential_duty_usd = standard_duty_usd
        note = ""

    vat_r = _vat_rate_fraction(payload.destination_country)
    vat_standard_usd = _money((value + standard_duty_usd) * vat_r)
    vat_preferential_usd = _money((value + preferential_duty_usd) * vat_r)

    total_standard = _money(value + standard_duty_usd + vat_standard_usd)
    total_preferential = _money(value + preferential_duty_usd + vat_preferential_usd)

    return DutyResponse(
        standard_duty_rate=std_rate,
        standard_duty_usd=standard_duty_usd,
        preferential_rate=pref_rate,
        preferential_duty_usd=preferential_duty_usd,
        vat_rate=vat_r,
        vat_usd=vat_preferential_usd,
        total_standard=total_standard,
        total_preferential=total_preferential,
        note=note,
    )


@router.post("/freight", response_model=FreightResponse)
def estimate_freight(
    payload: FreightRequest,
    _: User = Depends(get_current_user),
) -> FreightResponse:
    mode = payload.transport_mode.lower().strip()
    rate = FREIGHT_RATES_USD_PER_KG[mode]
    vol = (payload.length_cm * payload.width_cm * payload.height_cm) / VOLUMETRIC_DIVISOR
    vol = max(0.0, vol)
    billable = max(float(payload.weight_kg), vol)
    cost = _money(billable * rate)
    eta = FREIGHT_ETA_DAYS[mode]

    return FreightResponse(
        volumetric_weight_kg=_money(vol),
        billable_weight_kg=_money(billable),
        cost_usd=cost,
        eta_days=eta,
        transport_mode=mode,
        rate_per_kg=rate,
    )
