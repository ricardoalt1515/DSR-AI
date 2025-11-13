"""
DSR Business Opportunity Analysis - Output Models.

Simplified structure for DSR's waste brokerage business:
- Business opportunity analysis (all financial/strategic data)
- Life cycle assessment (all environmental data)
- AI creative insights

All data is now contained in 3 main structured blocks instead of 10+ redundant fields.
"""

from typing import Literal

from pydantic import Field, field_validator

from app.schemas.common import BaseSchema


# ============================================================================
# Business Opportunity Analysis (Structured Output)
# ============================================================================

class LandfillReduction(BaseSchema):
    """Landfill reduction metrics."""
    before: list[str] = Field(description="Current landfill volumes")
    after: list[str] = Field(description="Projected after DSR acquisition")
    annual_savings: list[str] = Field(description="Savings/benefits from diversion")


class WasteHandlingCostSavings(BaseSchema):
    """Cost savings for waste generator."""
    before: list[str] = Field(description="Current disposal costs")
    after: list[str] = Field(description="After DSR deal")
    annual_savings: list[str] = Field(description="Annual savings for generator")


class PotentialRevenue(BaseSchema):
    """DSR revenue potential from resale."""
    per_kg: list[str] = Field(default_factory=list, description="Revenue per unit")
    annual_potential: list[str] = Field(description="Annual revenue projection")
    market_rate: list[str] = Field(default_factory=list, description="Market rates researched")
    notes: list[str] = Field(default_factory=list, description="Revenue notes")


class BusinessOpportunity(BaseSchema):
    """Business opportunity analysis for DSR management."""

    # ============================================================================
    # Decision Summary (GO/NO-GO for DSR)
    # ============================================================================
    
    overall_recommendation: Literal["GO", "NO-GO", "INVESTIGATE FURTHER"] = Field(
        description="""GO/NO-GO decision for DSR management.
        
        GO: High margin (≥20%), buyer identified, low-medium risk
        NO-GO: Low margin (<10%), no buyers, high risk
        INVESTIGATE FURTHER: Moderate opportunity (10-20%), needs validation
        """
    )
    
    decision_summary: str = Field(
        description="""One-line executive summary of the opportunity.
        
        Examples:
        - "High-margin (75%) HDPE deal, ABC Plastics buyer @ $200/ton, $28k/year DSR profit"
        - "Low-margin wood opportunity, no contracted buyer yet - investigate further"
        - "NO-GO: Mixed contaminated plastics, <8% margin, regulatory barriers"
        """
    )

    # ============================================================================
    # Financial Analysis
    # ============================================================================

    landfill_reduction: LandfillReduction
    waste_handling_cost_savings: WasteHandlingCostSavings
    potential_revenue: PotentialRevenue

    # ============================================================================
    # Strategic Guidance
    # ============================================================================

    strategic_recommendations: list[str] = Field(
        min_length=1,
        description="Strategic recommendations for DSR (2-5 items)"
    )

    circular_economy_options: list[str] = Field(
        min_length=1,
        description="Multiple business ideas/pathways (2-4 ideas with revenue estimates)"
    )

    risks: list[str] = Field(
        min_length=1,
        description="Business risks DSR should monitor (2-5 risks)"
    )

    resource_considerations: "ResourceConsiderations" = Field(
        default_factory=lambda: ResourceConsiderations(
            environmental_impact=EnvironmentalImpact(
                current_situation=["N/A (environmental data missing)"],
                benefit_if_diverted=["N/A (environmental benefit missing)"],
                esg_story="N/A (ESG story missing)",
            ),
            material_handling=MaterialHandling(
                hazard_level="Low",
                specific_hazards=["N/A (hazards not provided)"],
                ppe_requirements=["N/A"],
                regulatory_notes=["N/A"],
                storage_requirements=["N/A"],
                degradation_risks=["N/A"],
                quality_price_impact=["N/A"],
            ),
            market_intelligence=MarketIntelligence(
                buyer_types=["N/A"],
                typical_requirements=["N/A"],
                pricing_factors=["N/A"],
            ),
        ),
        description="Practical handling, storage, and market considerations"
    )


# ============================================================================
# Life Cycle Assessment (LCA) (Structured Output)
# ============================================================================

# ============================================================================
# Resource Considerations (Practical Guidance)
# ============================================================================

class EnvironmentalImpact(BaseSchema):
    """Environmental context - current vs diverted."""
    current_situation: str = Field(
        description="What happens if waste continues as-is (pollution, emissions)"
    )
    benefit_if_diverted: str = Field(
        description="Environmental benefit if DSR acquires (pollution stopped, CO2 reduced)"
    )
    esg_story: str = Field(
        description="ESG narrative for corporate sustainability reporting"
    )


class MaterialHandling(BaseSchema):
    """Combined safety, handling, and storage guidance."""
    hazard_level: Literal["None", "Low", "Moderate", "High"] = Field(
        description="Overall hazard assessment"
    )
    specific_hazards: list[str] = Field(
        default_factory=list,
        description="Specific hazards (irritant, flammable, sharp, etc.)"
    )
    ppe_requirements: list[str] = Field(
        default_factory=list,
        description="Required PPE (gloves, mask, ventilation)"
    )
    regulatory_notes: list[str] = Field(
        default_factory=list,
        description="Permit or regulatory considerations"
    )
    storage_requirements: list[str] = Field(
        default_factory=list,
        description="How to store (dry, covered, temperature)"
    )
    degradation_risks: list[str] = Field(
        default_factory=list,
        description="What degrades quality (humidity, sun, contamination)"
    )
    quality_price_impact: list[str] = Field(
        default_factory=list,
        description="How storage/handling affects value"
    )


class MarketIntelligence(BaseSchema):
    """Generic market information (no specific company names)."""
    buyer_types: list[str] = Field(
        description="Types of industries that buy (e.g., 'lumber yards', 'biomass plants')"
    )
    typical_requirements: list[str] = Field(
        default_factory=list,
        description="Common volume/quality requirements"
    )
    pricing_factors: list[str] = Field(
        default_factory=list,
        description="Factors affecting price (quality, volume, segregation)"
    )


class ResourceConsiderations(BaseSchema):
    """Practical considerations for handling this resource."""
    environmental_impact: EnvironmentalImpact
    material_handling: MaterialHandling
    market_intelligence: MarketIntelligence


# ============================================================================
# Life Cycle Assessment (LCA) (Structured Output)
# ============================================================================

class CO2Reduction(BaseSchema):
    """CO₂ reduction metrics."""
    percent: list[str] = Field(default_factory=list, description="Percentage reduction")
    tons: list[str] = Field(description="Absolute tCO₂e avoided")
    method: list[str] = Field(description="Calculation methodology with EPA WaRM factors")


class ToxicityImpact(BaseSchema):
    """Toxicity and safety assessment."""
    level: str = Field(default="Low", description="Toxicity level: None, Low, Moderate, High")
    notes: str = Field(description="Detailed toxicity explanation and buyer guidance")


class ResourceEfficiency(BaseSchema):
    """Resource recovery metrics."""
    material_recovered_percent: list[str] = Field(description="Recovery rate percentages")
    notes: str = Field(description="Additional efficiency notes")

    @field_validator("notes", mode="before")
    @classmethod
    def _ensure_string(cls, value: str | list[str]) -> str:
        if isinstance(value, list):
            return "; ".join(value)
        return value


class LifeCycleAssessment(BaseSchema):
    """Complete Life Cycle Assessment (LCA)."""

    co2_reduction: CO2Reduction
    toxicity_impact: ToxicityImpact
    resource_efficiency: ResourceEfficiency

    environmental_notes: str = Field(
        description="Overall environmental summary (2-4 sentences)"
    )


# ============================================================================
# Main Report Output
# ============================================================================


class ProposalOutput(BaseSchema):
    """
    DSR Business Opportunity Analysis - Simplified Output.

    This output contains ONLY the essential data DSR needs to make GO/NO-GO decisions:
    1. Basic context (who, what, where)
    2. Business opportunity analysis (all financial/strategic data)
    3. Life cycle assessment (all environmental data)
    4. AI creative insights
    5. Full markdown report for PDF generation

    All previous redundant fields have been removed.
    """

    # ============================================================================
    # Basic Context (Minimal)
    # ============================================================================

    client_name: str = Field(description="Company/generator name")
    facility_type: str = Field(description="Facility classification (e.g., 'Industrial Manufacturing', 'Food Processing')")
    location: str = Field(description="City, State/Country")
    
    primary_waste_types: list[str] = Field(
        min_length=1,
        description="Primary waste streams (e.g., ['Wood scraps', 'HDPE plastic', 'Metal shavings'])"
    )
    
    daily_monthly_volume: str = Field(
        description="Total waste volume (e.g., '10 tons/month', '300 kg/day')"
    )
    
    existing_disposal_method: str = Field(
        description="Current handling (e.g., 'Landfill', 'Dumped in river', 'Partial recycling')"
    )

    # ============================================================================
    # CORE STRUCTURED DATA (All business logic here)
    # ============================================================================

    business_opportunity: "BusinessOpportunity" = Field(
        description="""Complete business analysis including:
        - Landfill reduction metrics
        - Cost savings for generator (negotiation leverage)
        - DSR revenue potential and market rates
        - Strategic recommendations
        - Multiple circular economy pathway ideas
        - Business risks to monitor
        - Material safety/handling concerns
        - Resource considerations (environmental, storage, market)
        """
    )

    lca: "LifeCycleAssessment" = Field(
        description="""Complete environmental analysis including:
        - CO₂ reduction with EPA WaRM factors
        - Water impact and pollution prevention
        - Toxicity assessment and safety guidance
        - Resource efficiency metrics
        - Environmental pitch for buyers/generators
        """
    )

    ai_insights: list[str] = Field(
        default_factory=list,
        description="""Creative insights and non-obvious opportunities (3-7 items).
        
        Examples:
        - 'Hardwood commands 30% premium - worth manual segregation'
        - 'Resin extraction could be separate revenue stream'
        - 'Generator can use "river pollution eliminated" in ESG report'
        - 'Furniture makers pay premium for "reclaimed" aesthetic'
        - 'Partnership model eliminates DSR CapEx'
        """
    )

    # ============================================================================
    # Display & Metadata
    # ============================================================================

    markdown_content: str = Field(
        default="",
        description="Complete markdown report for PDF generation and display. Generated from structured data above."
    )

    confidence_level: Literal["High", "Medium", "Low"] = Field(
        description="AI confidence based on data quality. High = complete data, Low = many assumptions made."
    )
