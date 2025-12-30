"""
DSR Business Opportunity Analysis - Output Models.

DESIGN: Minimal fields, structured for buyer pitches.
"""

from typing import Literal

from pydantic import Field

from app.schemas.common import BaseSchema


class BusinessPathway(BaseSchema):
    """Single business opportunity - ready to pitch to buyers."""
    
    action: str = Field(description="What DSR does: 'Shred to flakes', 'Sell as-is'")
    buyer_types: str = Field(description="Generic buyers: 'recyclers, furniture makers'")
    price_range: str = Field(description="Market rate: '$150-200/ton'")
    annual_value: str = Field(description="Projected: '$18k-24k/yr'")
    esg_pitch: str = Field(description="What BUYER tells their stakeholders")
    handling: str = Field(description="Transport/storage: 'Store dry, avoid resin'")


class FinancialSummary(BaseSchema):
    """Financial overview - one line each."""
    
    current_cost: str = Field(description="What generator pays now: '$18k/yr landfill'")
    dsr_offer: str = Field(description="DSR's value prop: 'We buy @ $50/ton'")
    dsr_margin: str = Field(description="DSR's margin: '~60% after transport'")


class EnvironmentalImpact(BaseSchema):
    """Environmental pitch for buyer presentations."""
    
    co2_avoided: str = Field(description="Using EPA factor: '144 tCO2e/yr'")
    esg_headline: str = Field(description="One-liner for press/reports")
    current_harm: str = Field(description="What happens if not diverted")


class SafetyHandling(BaseSchema):
    """Safety and handling guidance."""
    
    hazard: Literal["None", "Low", "Moderate", "High"] = Field(default="Low")
    warnings: str = Field(description="Health/safety risks")
    storage: str = Field(description="How to store/transport")


class ProposalOutput(BaseSchema):
    """
    DSR Opportunity Report - Buyer-Focused.
    
    Purpose: Provide material for DSR to pitch buyers.
    Audience: DSR sales team presenting to recyclers/buyers.
    """

    # 1. QUICK SUMMARY (for DSR internal)
    recommendation: Literal["GO", "NO-GO", "INVESTIGATE"] = Field(
        description="Internal decision"
    )
    headline: str = Field(
        description="One-line summary: 'High-margin HDPE, $28k/yr potential'"
    )
    confidence: Literal["High", "Medium", "Low"] = Field(default="Medium")

    # 2. CONTEXT (who/what)
    client: str = Field(description="Company name")
    location: str = Field(description="City, State")
    material: str = Field(
        description="Detailed waste description including: type, composition/chemistry, physical state, and key handling characteristics. Example: 'Acidic liquid waste (dilute H2SO4 with dissolved metal ions), corrosive, requires hazardous waste handling per EPA regulations'"
    )
    volume: str = Field(description="Quantity: '10 tons/month'")

    # 3. FINANCIALS
    financials: FinancialSummary
    
    # 4. ENVIRONMENT (for buyer pitches)
    environment: EnvironmentalImpact
    
    # 5. SAFETY
    safety: SafetyHandling

    # 6. BUSINESS PATHWAYS (the core value)
    pathways: list[BusinessPathway] = Field(
        min_length=2,
        max_length=5,
        description="Ideas ordered by margin. Include creative options."
    )

    # 7. RISKS & NEXT STEPS
    risks: list[str] = Field(
        min_length=1,
        max_length=4,
        description="Key blockers"
    )
    next_steps: list[str] = Field(
        min_length=1,
        max_length=3,
        description="What DSR does this week"
    )
    
    # 8. ROI SUMMARY (like Wastetide's "$100 → $1000")
    roi_summary: str = Field(
        default="",
        description="Simple ROI pitch: 'Acquisition $5k → Revenue $28k/yr = 460% ROI'"
    )
