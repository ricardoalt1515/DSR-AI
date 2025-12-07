"""
Structured output model for image analysis agent.

This model defines the expected output when analyzing waste resource images.
Designed to extract business-relevant information for DSR's waste brokerage.
"""

from typing import Literal

from pydantic import Field

from app.schemas.common import BaseSchema


class CompositionItem(BaseSchema):
    """A single component of the material composition."""

    component: str = Field(description="Material component name")
    proportion: str = Field(description="Estimated proportion (e.g., '60%', 'majority')")


class ImageAnalysisOutput(BaseSchema):
    """
    Structured analysis output for waste resource images.

    This model captures business-actionable insights from photos:
    - Material identification and quality
    - Environmental context (current vs diverted)
    - Handling and safety requirements
    - Market intelligence for buyers
    """

    # Core identification
    material_type: str = Field(
        description="Primary material identified (e.g., 'HDPE plastic', 'Mixed wood pallets')"
    )
    quality_grade: Literal["High", "Medium", "Low"] = Field(
        description="Visual quality assessment based on contamination, damage, uniformity"
    )
    confidence: Literal["High", "Medium", "Low"] = Field(
        description="AI confidence in the analysis based on image clarity and material visibility"
    )
    lifecycle_status: Literal["Like-new", "Good", "Used", "Degraded", "End-of-life"] = Field(
        default="Used",
        description="Visible lifecycle stage - affects resale value and buyer options"
    )

    # Composition breakdown
    estimated_composition: list[CompositionItem] = Field(
        default_factory=list,
        description="Breakdown of material components with proportions",
    )

    # Environmental context (required for ESG story)
    current_situation: str = Field(
        description="What happens if this waste continues as-is (pollution, landfill, etc.)"
    )
    benefit_if_diverted: str = Field(
        description="Environmental benefit if DSR acquires this material"
    )

    # Handling guidance (safety and storage)
    ppe_requirements: list[str] = Field(
        default_factory=list,
        description="Required PPE for handling (e.g., 'N95 mask', 'Cut-resistant gloves')",
    )
    storage_requirements: list[str] = Field(
        default_factory=list,
        description="Storage recommendations (e.g., 'Keep dry', 'Store under roof')",
    )
    degradation_risks: list[str] = Field(
        default_factory=list,
        description="Factors that could degrade quality (e.g., 'UV exposure', 'Moisture')",
    )

    # Market intelligence
    potential_buyer_types: list[str] = Field(
        default_factory=list,
        description="Generic buyer categories (e.g., 'Recyclers', 'Biomass plants') - NO company names",
    )
    typical_requirements: list[str] = Field(
        default_factory=list,
        description="Common buyer requirements (e.g., 'Min 5 tons/month', 'Moisture <15%')",
    )
    price_band_hint: str = Field(
        default="N/A",
        description="Approximate price range hint (e.g., '$80-$120/ton') with labeled Assumption",
    )

    # Business opportunities
    business_ideas: list[str] = Field(
        default_factory=list,
        description="Creative valorization ideas (max 3, format: 'Action → buyer type @ price')",
    )
    deal_risks: list[str] = Field(
        default_factory=list,
        description="Potential business risks visible from image (contamination, volume uncertainty)",
    )

    # Summary
    summary: str = Field(
        description="One-line business summary of the opportunity (20-30 words)"
    )
