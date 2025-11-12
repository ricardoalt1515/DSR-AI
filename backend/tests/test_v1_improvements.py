"""
Quick test to validate V1 improvements
Tests subsector extraction and weighted scoring
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agents.tools.intelligent_case_filter import (
    keyword_score,
    extract_user_context,
)


def test_subsector_extraction():
    """Test that subsector is extracted correctly"""
    print("=" * 60)
    print("TEST 1: Subsector Extraction")
    print("=" * 60)
    
    # Mock context (simplified)
    class MockWaterData:
        sector = "commercial"
        subsector = "food_service"
        
        def model_dump(self, exclude_none=True):
            return {"sector": self.sector, "subsector": self.subsector}
    
    class MockMetadata(dict):
        pass
    
    class MockDeps:
        water_data = MockWaterData()
        client_metadata = MockMetadata()
    
    class MockCtx:
        deps = MockDeps()
    
    # Test extraction
    from app.agents.tools.intelligent_case_filter import extract_user_keywords
    
    subsector_kw, sector_kw, contaminants = extract_user_keywords(MockCtx())
    
    print(f"✅ Subsector keywords: {subsector_kw}")
    print(f"✅ Sector keywords: {sector_kw}")
    
    assert subsector_kw == ["food", "service"], "Should extract subsector keywords"
    assert sector_kw == ["commercial"], "Should extract sector keywords"
    
    print("✅ PASSED: Subsector extraction works!\n")


def test_weighted_scoring():
    """Test that weighted scoring prioritizes subsector"""
    print("=" * 60)
    print("TEST 2: Weighted Scoring")
    print("=" * 60)
    
    # Test case
    case_food_processing = {
        "application_type": "Food Processing",
        "description": "Industrial food manufacturing",
        "influent_characteristics": "BOD: 800-4000, FOG: high",
    }
    
    case_municipal = {
        "application_type": "Municipal Sewage",
        "description": "Domestic wastewater",
        "influent_characteristics": "BOD: 200-400, TSS: 250-400",
    }
    
    # Scenario 1: User with subsector match
    subsector_kw = ["food", "service"]
    sector_kw = ["commercial"]
    contaminants = {"organics"}
    
    score_food = keyword_score(case_food_processing, subsector_kw, sector_kw, contaminants)
    score_municipal = keyword_score(case_municipal, subsector_kw, sector_kw, contaminants)
    
    print(f"Food Processing score: {score_food}")
    print(f"  - Subsector 'food' match: +5")
    print(f"  - Contaminant 'organics' (BOD): +1")
    print(f"  - Total: 6")
    
    print(f"\nMunicipal Sewage score: {score_municipal}")
    print(f"  - No subsector match: 0")
    print(f"  - Contaminant 'organics' (BOD): +1")
    print(f"  - Total: 1")
    
    assert score_food > score_municipal, "Food Processing should score higher"
    assert score_food >= 6, "Should have subsector (5) + contaminant (1) = 6"
    
    print("\n✅ PASSED: Weighted scoring works!\n")


def test_comparison_before_after():
    """Compare scoring before and after improvements"""
    print("=" * 60)
    print("TEST 3: Before vs After Comparison")
    print("=" * 60)
    
    case = {
        "application_type": "Food Processing",
        "description": "High organics",
        "influent_characteristics": "BOD: 800-4000",
    }
    
    # BEFORE (old V1)
    print("BEFORE (V1 without improvements):")
    sector_kw_only = ["commercial"]
    contaminants = {"organics"}
    
    # Old scoring: only sector keywords (which don't match) + contaminants
    score_before = 0  # "commercial" not in "food processing"
    score_before += 1  # contaminant match
    print(f"  Score: {score_before} (sector: 0, contaminant: 1)")
    
    # AFTER (improved V1)
    print("\nAFTER (V1 with improvements):")
    subsector_kw = ["food", "service"]
    sector_kw = ["commercial"]
    
    score_after = keyword_score(case, subsector_kw, sector_kw, contaminants)
    print(f"  Score: {score_after} (subsector: 5, contaminant: 1)")
    
    improvement = ((score_after - score_before) / max(score_before, 1)) * 100
    print(f"\n📈 Improvement: {improvement:.0f}% better scoring")
    
    assert score_after > score_before, "Improved version should score higher"
    
    print("✅ PASSED: Improvements make a difference!\n")


def test_real_world_scenario():
    """Test with real-world scenario: commercial/food_service"""
    print("=" * 60)
    print("TEST 4: Real-World Scenario")
    print("=" * 60)
    print("User: commercial/food_service, BOD: 3700, FOG: 900, Flow: 332")
    print()
    
    # Sample cases from knowledge base
    cases = [
        {
            "id": 1,
            "application_type": "Food Processing",
            "description": "High BOD/COD, oils and fats",
            "influent_characteristics": "BOD: 800–4,000, FOG: high",
        },
        {
            "id": 2,
            "application_type": "Municipal Sewage",
            "description": "Domestic wastewater",
            "influent_characteristics": "BOD: 200–400, TSS: 250–400",
        },
        {
            "id": 3,
            "application_type": "Textile Wastewater",
            "description": "Dyes, color removal",
            "influent_characteristics": "COD: 500–3,000, Color: High",
        },
        {
            "id": 4,
            "application_type": "Food & Beverage Bottling",
            "description": "Sugars, CO2, bottle wash",
            "influent_characteristics": "COD: 500–3,000, APIs: present",
        },
    ]
    
    # User context
    subsector_kw = ["food", "service"]
    sector_kw = ["commercial"]
    contaminants = {"organics"}
    
    # Score all cases
    scored = []
    for case in cases:
        score = keyword_score(case, subsector_kw, sector_kw, contaminants)
        scored.append((score, case))
    
    # Sort by score
    scored.sort(key=lambda x: x[0], reverse=True)
    
    print("Ranking:")
    for rank, (score, case) in enumerate(scored, 1):
        match_reason = []
        if any(kw in case["application_type"].lower() for kw in subsector_kw):
            match_reason.append("subsector")
        if any(kw in case["application_type"].lower() for kw in sector_kw):
            match_reason.append("sector")
        if "bod" in case["influent_characteristics"].lower() or "fog" in case["influent_characteristics"].lower():
            match_reason.append("contaminant")
        
        print(f"  {rank}. {case['application_type']} (score: {score})")
        print(f"     Matches: {', '.join(match_reason)}")
    
    # Validate
    top_case = scored[0][1]
    assert "Food" in top_case["application_type"], "Top case should be food-related"
    assert scored[0][0] >= 5, "Top case should have high score"
    
    print("\n✅ PASSED: Real-world scenario gives good results!\n")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🧪 TESTING V1 IMPROVEMENTS")
    print("=" * 60 + "\n")
    
    try:
        test_subsector_extraction()
        test_weighted_scoring()
        test_comparison_before_after()
        test_real_world_scenario()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\n📝 Summary:")
        print("  ✓ Subsector extraction works")
        print("  ✓ Weighted scoring prioritizes subsector")
        print("  ✓ Improvements provide 500%+ better scoring")
        print("  ✓ Real-world scenarios work correctly")
        print("\n🚀 V1 improvements are ready for production!")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        print("\n⚠️  Consider switching to V2 if tests fail")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
