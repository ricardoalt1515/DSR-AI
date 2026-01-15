"""
Waste opportunity analysis - Output Models.

DESIGN: Compact, structured fields suitable for internal review and buyer-ready excerpts.
All pricing and financial figures are indicative estimates unless sourced.
"""

from typing import Literal

from pydantic import Field

from app.schemas.common import BaseSchema


class BusinessPathway(BaseSchema):
    """Single business opportunity - ready to pitch to buyers."""

    action: str = Field(description="What we do: 'Shred to flakes', 'Sell as-is'")
    buyer_types: str = Field(description="Generic buyers: 'recyclers, furniture makers'")
    price_range: str = Field(description="Market rate: '$150-200/ton'")
    annual_value: str = Field(description="Projected: '$18k-24k/yr'")
    esg_pitch: str = Field(description="What BUYER tells their stakeholders")
    handling: str = Field(description="Transport/storage: 'Store dry, avoid resin'")
    feasibility: Literal["High", "Medium", "Low"] = Field(
        default="Medium",
        description="Feasibility given typical operational constraints (not a guarantee).",
    )
    target_locations: list[str] = Field(
        default_factory=list,
        description="Example geographies to pursue this pathway (cities/regions).",
    )
    why_it_works: str = Field(
        description="Short rationale explaining why this pathway is attractive and feasible.",
    )


class FinancialSummary(BaseSchema):
    """Financial overview - one line each."""

    current_cost: str = Field(description="What generator pays now: '$18k/yr landfill'")
    offer_terms: str = Field(description="Offer structure/value prop: 'We buy @ $50/ton'")
    estimated_margin: str = Field(description="Estimated margin: '~60% after transport'")


class EconomicsDeepDive(BaseSchema):
    """More detailed economics for internal decision-making (still estimate-only)."""

    profitability_band: Literal["High", "Medium", "Low", "Unknown"] = Field(
        default="Unknown",
        description="Qualitative profitability band (no precise numbers required).",
    )
    profitability_summary: str = Field(
        description="2-4 sentences explaining profitability and key drivers (estimate-only).",
    )
    cost_breakdown: list[str] = Field(
        min_length=3,
        max_length=8,
        description="Clear cost line items as ranges (transport, sorting, processing, etc.).",
    )
    scenario_summary: list[str] = Field(
        min_length=2,
        max_length=3,
        description="Best/base/worst case economics summarized as strings (estimate-only).",
    )
    assumptions: list[str] = Field(
        default_factory=list,
        max_length=10,
        description="Assumptions used to estimate revenue/costs.",
    )
    data_gaps: list[str] = Field(
        default_factory=list,
        max_length=10,
        description="Missing inputs required to increase confidence (quotes, lab tests, logistics, etc.).",
    )


class EnvironmentalImpact(BaseSchema):
    """Environmental pitch for buyer presentations."""

    co2_avoided: str = Field(description="Using EPA factor: '144 tCO2e/yr'")
    esg_headline: str = Field(description="One-liner for press/reports")
    current_harm: str = Field(description="What happens if not diverted")
    water_savings: str = Field(
        default="",
        description="Estimated water savings: 'X gallons/year' or 'Not estimable'. "
        "Base on virgin material displacement factors.",
    )
    circularity_potential: Literal["High", "Medium", "Low"] = Field(
        default="Medium",
        description="High=closed-loop, Medium=downcycling, Low=energy recovery.",
    )
    circularity_rationale: str = Field(
        default="",
        description="1-2 sentences explaining circularity assessment.",
    )


class SafetyHandling(BaseSchema):
    """Safety and handling guidance."""

    hazard: Literal["None", "Low", "Moderate", "High"] = Field(default="Low")
    warnings: str = Field(description="Health/safety risks")
    storage: str = Field(description="How to store/transport")


class ProposalOutput(BaseSchema):
    """
    Opportunity Report - Internal (operator team).

    Purpose: Support internal decision-making and enable buyer-ready pitching.
    Audience: Internal operators and sales team.
    """

    # 1. QUICK SUMMARY (for internal team)
    recommendation: Literal["GO", "NO-GO", "INVESTIGATE"] = Field(description="Internal decision")
    headline: str = Field(description="One-line summary: 'High-margin HDPE, $28k/yr potential'")
    confidence: Literal["High", "Medium", "Low"] = Field(default="Medium")

    # 2. CONTEXT (who/what)
    client: str = Field(description="Company name")
    location: str = Field(description="City, State")
    material: str = Field(
        description=(
            "Material Summary: 2-4 paragraphs, 120-200 words. "
            "Integrate ALL questionnaire details + photo insights. "
            "Do NOT summarize to a single sentence. "
            "Include: origin/processes, material types & subtypes, "
            "cleanliness/contamination, physical form, current handling practices, "
            "degradation risks, and handling notes."
        )
    )
    volume: str = Field(description="Quantity: '10 tons/month'")

    # 3. FINANCIALS
    financials: FinancialSummary
    economics_deep_dive: EconomicsDeepDive = Field(
        description="Detailed economics for internal review (all estimate-only).",
    )

    # 4. ENVIRONMENT (for buyer pitches)
    environment: EnvironmentalImpact

    # 5. SAFETY
    safety: SafetyHandling

    # 6. BUSINESS PATHWAYS (the core value)
    pathways: list[BusinessPathway] = Field(
        min_length=3,
        max_length=10,
        description="Ideas ordered by margin and feasibility. Include creative options.",
    )

    # 7. RISKS & NEXT STEPS
    risks: list[str] = Field(min_length=1, max_length=4, description="Key blockers")
    next_steps: list[str] = Field(min_length=1, max_length=3, description="What the team does next")

    # 8. ROI SUMMARY (like Wastetide's "$100 → $1000")
    roi_summary: str = Field(
        default="", description="Simple ROI pitch: 'Acquisition $5k → Revenue $28k/yr = 460% ROI'"
    )
