"""
External (client-facing) opportunity report schema.

Sustainability-first, with explicit "not_computed" placeholders and no
sensitive commercial details.
"""

from datetime import datetime, timezone
from typing import Literal

from pydantic import Field

from app.schemas.common import BaseSchema


MetricStatus = Literal["computed", "not_computed"]
ProfitabilityBand = Literal["High", "Medium", "Low", "Unknown"]


def _utc_now_iso() -> str:
    """Return current UTC time as ISO string for JSON serialization."""
    return datetime.now(timezone.utc).isoformat()


class SustainabilityMetric(BaseSchema):
    """Single sustainability metric with explicit computation status."""

    status: MetricStatus = Field(
        default="not_computed",
        description="Whether this metric was computed from available data.",
    )
    value: str | None = Field(
        default=None,
        description="Computed value with units, if available.",
    )
    basis: str | None = Field(
        default=None,
        description="Methodology or basis used for the calculation.",
    )
    data_needed: list[str] = Field(
        default_factory=list,
        description="Missing inputs required to compute the metric.",
    )


class CircularityIndicator(BaseSchema):
    """Named circularity indicator with its metric."""

    name: str = Field(description="Indicator name.")
    metric: SustainabilityMetric = Field(description="Metric for this indicator.")


class SustainabilitySection(BaseSchema):
    """Sustainability overview for the external report."""

    summary: str = Field(description="Executive sustainability summary.")
    co2e_reduction: SustainabilityMetric = Field(
        description="CO2e reduction metric."
    )
    water_savings: SustainabilityMetric = Field(
        description="Water savings metric."
    )
    circularity: list[CircularityIndicator] = Field(
        default_factory=list,
        description="Circularity indicators with metrics.",
    )
    overall_environmental_impact: str = Field(
        description="Qualitative environmental impact statement.",
    )


class ExternalOpportunityReport(BaseSchema):
    """Client-facing report schema (no sensitive commercial data)."""

    report_version: str = Field(
        default="v1",
        description="Schema version for the external report.",
    )
    generated_at: str = Field(
        default_factory=_utc_now_iso,
        description="UTC timestamp when the report was generated (ISO format).",
    )
    sustainability: SustainabilitySection = Field(
        description="Sustainability-focused report content.",
    )
    profitability_band: ProfitabilityBand = Field(
        default="Unknown",
        description="Qualitative profitability band only.",
    )
    end_use_industry_examples: list[str] = Field(
        default_factory=list,
        description="Generic end-use industry examples only.",
    )

