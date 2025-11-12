"""
Pydantic schemas for flexible project data.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WaterQualityParameter(BaseModel):
    """Individual water quality parameter"""
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class ProjectBasicInfo(BaseModel):
    """Basic project information"""
    company_name: Optional[str] = None
    client_contact: Optional[str] = None
    location: Optional[str] = None
    sector: Optional[str] = None
    subsector: Optional[str] = None
    water_source: Optional[str] = None
    water_uses: Optional[str] = None
    discharge_method: Optional[str] = None
    discharge_location: Optional[str] = None


class ProjectConsumption(BaseModel):
    """Water consumption data"""
    water_consumption: Optional[float] = Field(None, description="m³/day")
    wastewater_generation: Optional[float] = Field(None, description="m³/day")
    water_cost: Optional[float] = Field(None, description="USD/m³")
    people_served: Optional[str] = None


class ProjectRequirements(BaseModel):
    """Project requirements and constraints"""
    regulatory: Optional[str] = None
    existing_treatment: Optional[str] = None
    constraints: Optional[str] = None


class CustomSection(BaseModel):
    """User-defined custom section"""
    id: str
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    order: int = 0
    fields: List[Dict[str, Any]] = Field(default_factory=list)


class ProjectDataStructure(BaseModel):
    """
    Complete project data structure.
    Flexible - all fields are optional.
    """
    basic_info: ProjectBasicInfo = Field(default_factory=ProjectBasicInfo)
    consumption: ProjectConsumption = Field(default_factory=ProjectConsumption)
    quality: Dict[str, Any] = Field(default_factory=dict)
    requirements: ProjectRequirements = Field(default_factory=ProjectRequirements)
    objectives: List[str] = Field(default_factory=list)
    sections: List[CustomSection] = Field(default_factory=list)


class ProjectDataUpdate(BaseModel):
    """
    Flexible update model - accepts any structure.
    Backend will merge with existing data.
    """
    data: Dict[str, Any] = Field(..., description="Flexible project data")


class ProjectAIInput(BaseModel):
    """
    Structured input for AI agent.
    Extracts known fields + preserves custom data.
    """
    # Basic Info
    company_name: Optional[str] = None
    client_contact_info: Optional[str] = None
    project_location: Optional[str] = None
    sector_info: Optional[str] = None
    subsector_details: Optional[str] = None
    
    # Consumption
    water_consumption_data: Optional[str] = None
    wastewater_generation_data: Optional[str] = None
    water_cost_data: Optional[str] = None
    people_served_data: Optional[str] = None
    
    # Water Quality
    water_quality_analysis: Dict[str, str] = Field(default_factory=dict)
    water_quality_parameters: List[str] = Field(default_factory=list)
    
    # Source & Usage
    water_source_info: Optional[str] = None
    water_uses_info: Optional[str] = None
    current_discharge_method: Optional[str] = None
    discharge_location: Optional[str] = None
    
    # Requirements
    regulatory_requirements: Optional[str] = None
    existing_treatment_systems: Optional[str] = None
    project_constraints: Optional[str] = None
    
    # Objectives
    project_objectives: List[str] = Field(default_factory=list)
    
    # Custom sections (user-added data)
    custom_sections: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Raw data backup
    raw_data: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "company_name": "IBYMA",
                "client_contact_info": "Ricardo Marquez",
                "project_location": "Los Mochis",
                "sector_info": "Industrial",
                "subsector_details": "Food and Beverages",
                "water_consumption_data": "350 m³/day",
                "wastewater_generation_data": "242 m³/day",
                "water_cost_data": "7 USD/m³",
                "people_served_data": "20 to 50",
                "water_quality_analysis": {
                    "BOD": "3700 mg/L",
                    "FOG": "150 mg/L"
                },
                "water_quality_parameters": ["BOD", "FOG"],
                "water_source_info": "Municipal network",
                "water_uses_info": "Cleaning and sanitation",
                "regulatory_requirements": "Compliance with norm 002",
                "existing_treatment_systems": "No existing treatment system",
                "project_constraints": "Regulatory restrictions",
                "current_discharge_method": "To the municipal sewer system",
                "discharge_location": "Municipal sewer",
                "project_objectives": [
                    "Comply with discharge or water quality regulations",
                    "Reduce environmental footprint / Improve sustainability",
                    "Save costs / Achieve a return on investment"
                ]
            }
        }
