from pydantic import BaseModel, Field

from fastapi import APIRouter

router = APIRouter()


class DutyRequest(BaseModel):
    hs_code: str = Field(..., description="Harmonized System code")
    declared_value: float = Field(ge=0)
    origin_country: str = ""
    destination_country: str = ""


class DutyResponse(BaseModel):
    estimated_duty: float
    currency: str = "USD"
    notes: str = "Placeholder duty estimate — replace with tariff engine."


class FreightRequest(BaseModel):
    weight_kg: float = Field(gt=0)
    origin: str = ""
    destination: str = ""
    mode: str = "sea"


class FreightResponse(BaseModel):
    estimated_freight: float
    currency: str = "USD"
    notes: str = "Placeholder freight estimate — replace with carrier API."


@router.post("/duties", response_model=DutyResponse)
def estimate_duties(payload: DutyRequest) -> DutyResponse:
    # Placeholder: wire customs/tariff data sources
    rate = 0.05
    return DutyResponse(estimated_duty=round(payload.declared_value * rate, 2))


@router.post("/freight", response_model=FreightResponse)
def estimate_freight(payload: FreightRequest) -> FreightResponse:
    # Placeholder: wire freight APIs
    base = payload.weight_kg * 2.5
    return FreightResponse(estimated_freight=round(base, 2))
