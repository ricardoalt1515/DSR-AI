"""
Structured output model for image analysis agent.

Single responsibility: Visual identification + LCA/CO₂ assessment.
Business logic (pricing, buyers, ideas) belongs in proposal_agent.
"""

from typing import Literal

from pydantic import Field

from app.schemas.common import BaseSchema


# EPA WaRM CO₂ factors (tonnes CO2e avoided per tonne recycled vs landfilled)
EPA_WARM_FACTORS = {
    "HDPE": 2.0,
    "PET": 2.0,
    "Mixed plastics": 1.5,
    "Cardboard": 3.1,
    "Wood": 1.6,
    "Steel": 1.7,
    "Aluminum": 4.0,
    "Glass": 0.3,
    "Textiles": 3.0,
    "Food waste": 0.5,
    "Mixed waste": 0.5,
}


class CompositionItem(BaseSchema):
    """A single component of the material composition."""

    component: str = Field(description="Material component name")
    proportion: str = Field(description="Estimated proportion (e.g., '60%', 'majority')")


class ImageAnalysisOutput(BaseSchema):
    """
    Visual + LCA analysis output.
    
    Single responsibility: Extract what CAN BE SEEN + calculate environmental impact.
    Does NOT include: pricing, buyers, business ideas (Proposal Agent handles those).
    """

    # ═══════════════════════════════════════════════════════════════════════════
    # VISUAL IDENTIFICATION
    # ═══════════════════════════════════════════════════════════════════════════
    
    material_type: str = Field(
        description="Primary material identified (e.g., 'HDPE plastic drums')"
    )
    quality_grade: Literal["High", "Medium", "Low"] = Field(
        description="Visual quality: High (clean), Medium (some contamination), Low (damaged)"
    )
    lifecycle_status: Literal["Like-new", "Good", "Used", "Degraded", "End-of-life"] = Field(
        description="Visible condition affecting resale/recycling value"
    )
    confidence: Literal["High", "Medium", "Low"] = Field(
        description="Analysis confidence based on image clarity"
    )
    estimated_composition: list[CompositionItem] = Field(
        default_factory=list,
        description="Material breakdown with proportions",
    )

    # ═══════════════════════════════════════════════════════════════════════════
    # LCA / ENVIRONMENTAL IMPACT
    # ═══════════════════════════════════════════════════════════════════════════
    
    current_disposal_pathway: Literal[
        "Landfill", "Incineration", "Stockpiling", "Open burning", "Unknown"
    ] = Field(
        default="Landfill",
        description="What happens if this waste is not diverted"
    )
    co2_if_disposed: float = Field(
        default=0.0,
        description="Estimated CO₂e if current disposal continues (tonnes/year)"
    )
    co2_if_diverted: float = Field(
        default=0.0,
        description="Estimated CO₂e if recycled/upcycled (tonnes/year)"
    )
    co2_savings: float = Field(
        default=0.0,
        description="CO₂e avoided by diversion (tonnes/year)"
    )
    esg_statement: str = Field(
        description="Ready-to-use statement for customer ESG reports"
    )
    lca_assumptions: str = Field(
        default="",
        description="Key assumptions made (e.g., 'Based on ~200kg visible, EPA WaRM factors')"
    )

    # ═══════════════════════════════════════════════════════════════════════════
    # HANDLING & SAFETY
    # ═══════════════════════════════════════════════════════════════════════════
    
    ppe_requirements: list[str] = Field(
        default_factory=list,
        description="Required PPE for handling (e.g., 'Gloves', 'N95 mask')",
    )
    storage_requirements: list[str] = Field(
        default_factory=list,
        description="Storage recommendations (e.g., 'Keep dry', 'Store under roof')",
    )
    degradation_risks: list[str] = Field(
        default_factory=list,
        description="Factors that degrade quality (e.g., 'UV exposure', 'Moisture')",
    )
    visible_hazards: list[str] = Field(
        default_factory=list,
        description="Warning labels, chemical markings visible in image",
    )

    # ═══════════════════════════════════════════════════════════════════════════
    # SUMMARY
    # ═══════════════════════════════════════════════════════════════════════════
    
    summary: str = Field(
        description="One-line summary of the material and its condition (20-30 words)"
    )
