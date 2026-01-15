"""
External (client-facing) opportunity report schema.

Sustainability-first, with explicit "not_computed" placeholders and no
sensitive commercial details.
"""

from datetime import UTC, datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import BaseSchema

MetricStatus = Literal["computed", "not_computed"]
ProfitabilityBand = Literal["High", "Medium", "Low", "Unknown"]
AnnualImpactMagnitudeBand = Literal[
    "Unknown",
    "Under five figures",
    "Five figures",
    "Six figures",
    "Seven figures+",
]
AnnualImpactBasis = Literal[
    "Unknown",
    "Avoided disposal cost",
    "Revenue potential",
    "Mixed",
]
AnnualImpactConfidence = Literal["Low", "Medium", "High"]


def _utc_now_iso() -> str:
    """Return current UTC time as ISO string for JSON serialization."""
    return datetime.now(UTC).isoformat()


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
    co2e_reduction: SustainabilityMetric = Field(description="CO2e reduction metric.")
    water_savings: SustainabilityMetric = Field(description="Water savings metric.")
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
        default="v3",
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
    material_description: str = Field(
        default="",
        description="Detailed material description for client.",
    )
    recommended_actions: list[str] = Field(
        default_factory=list,
        description="Valorization actions: ['Shred to flakes', 'Sort by color'].",
    )
    handling_guidance: list[str] = Field(
        default_factory=list,
        description="Handling requirements: ['Store dry', 'Avoid UV exposure'].",
    )
    profitability_statement: str = Field(
        default="",
        description="Qualitative profitability statement based on ROI threshold.",
    )
    annual_impact_magnitude_band: AnnualImpactMagnitudeBand = Field(
        default="Unknown",
        description="Annual economic impact magnitude band (non-sensitive).",
    )
    annual_impact_basis: AnnualImpactBasis = Field(
        default="Unknown",
        description="Basis for the annual impact estimate.",
    )
    annual_impact_confidence: AnnualImpactConfidence = Field(
        default="Low",
        description="Confidence level for the annual impact band.",
    )
    annual_impact_notes: list[str] = Field(
        default_factory=list,
        description="Notes or data gaps for the annual impact estimate.",
    )
    annual_impact_narrative: str = Field(
        default="",
        description="Rich narrative explanation of annual impact (composed from internal data).",
    )
    opportunity_narrative: str = Field(
        default="",
        description="Summary of opportunity with pathways (composed from internal data).",
    )
