"""
Unit Tests for Intelligent Case Filter V2

Tests semantic matching, scoring, and edge cases.
Follows best practices for AI agent tool testing.
"""

import pytest
from app.agents.tools.intelligent_case_filter_v2 import (
    MatchScore,
    SemanticCaseMatcher,
    UserContext,
)

# ============================================================================
# TEST FIXTURES
# ============================================================================


@pytest.fixture
def matcher():
    """Create a SemanticCaseMatcher instance"""
    return SemanticCaseMatcher()


@pytest.fixture
def sample_cases():
    """Sample cases for testing"""
    return [
        {
            "id": 1,
            "application_type": "Food Processing",
            "description": "High organics, oils and fats",
            "typical_flow_range": "50–10,000",
            "influent_characteristics": "BOD: 800–4,000, FOG: high",
        },
        {
            "id": 2,
            "application_type": "Municipal Sewage",
            "description": "Domestic wastewater",
            "typical_flow_range": "100–100,000",
            "influent_characteristics": "BOD: 200–400, TSS: 250–400",
        },
        {
            "id": 3,
            "application_type": "Textile Wastewater",
            "description": "Dyes, low biodegradability",
            "typical_flow_range": "20–2,000",
            "influent_characteristics": "COD: 500–3,000, Color: High",
        },
        {
            "id": 4,
            "application_type": "Hotel Hospitality",
            "description": "Mixed domestic and laundry wastewater",
            "typical_flow_range": "50–2,000",
            "influent_characteristics": "BOD: 300–600, TSS: 200–500",
        },
    ]


# ============================================================================
# SEMANTIC MATCHING TESTS
# ============================================================================


class TestSemanticMatching:
    """Test semantic similarity calculations"""

    def test_direct_subsector_match(self, matcher, sample_cases):
        """Test direct subsector matching"""
        score, explanations = matcher.calculate_semantic_score(
            "commercial", "food_service", sample_cases[0]
        )

        assert score > 10.0, "Should have high score for food match"
        assert any("food" in exp.lower() for exp in explanations), "Should explain food match"

    def test_synonym_match(self, matcher, sample_cases):
        """Test synonym-based matching"""
        # "hotel" should match "Hotel Hospitality" via synonym "hospitality"
        score, explanations = matcher.calculate_semantic_score(
            "commercial", "hotel", sample_cases[3]
        )

        assert score > 10.0, "Should match via synonym"
        assert any("hospitality" in exp.lower() for exp in explanations), (
            "Should explain synonym match"
        )

    def test_sector_match(self, matcher, sample_cases):
        """Test sector-level matching"""
        score, _explanations = matcher.calculate_semantic_score(
            "municipal", "government_building", sample_cases[1]
        )

        assert score > 0, "Should match on sector level"

    def test_no_match(self, matcher, sample_cases):
        """Test case with no semantic match"""
        score, _explanations = matcher.calculate_semantic_score(
            "residential",
            "single_home",
            sample_cases[2],  # Textile case
        )

        # Should still return something, even if low score
        assert isinstance(score, float), "Should return numeric score"


class TestContaminantMatching:
    """Test contaminant detection and scoring"""

    def test_organics_match(self, matcher, sample_cases):
        """Test detection of organic contaminants"""
        user_contaminants = {"organics"}
        score, matched = matcher.calculate_contaminant_score(user_contaminants, sample_cases[0])

        assert score > 0, "Should detect BOD/FOG as organics"
        assert "organics" in matched, "Should report organics as matched"

    def test_multiple_contaminants(self, matcher, sample_cases):
        """Test multiple contaminant categories"""
        user_contaminants = {"organics", "suspended"}
        score, matched = matcher.calculate_contaminant_score(
            user_contaminants,
            sample_cases[1],  # Municipal with BOD and TSS
        )

        assert score >= 10.0, "Should match both categories"
        assert len(matched) == 2, "Should match both contaminant types"

    def test_no_contaminant_match(self, matcher, sample_cases):
        """Test case with no contaminant match"""
        user_contaminants = {"metals"}
        score, matched = matcher.calculate_contaminant_score(
            user_contaminants,
            sample_cases[0],  # Food processing (no metals)
        )

        assert score == 0.0, "Should have zero score for no match"
        assert len(matched) == 0, "Should have empty match list"


class TestFlowMatching:
    """Test flow rate compatibility"""

    def test_perfect_flow_match(self, matcher, sample_cases):
        """Test flow within case range"""
        score, explanation = matcher.calculate_flow_score(332.0, sample_cases[0])

        assert score == 10.0, "Should have perfect score for flow in range"
        assert "perfect" in explanation.lower(), "Should indicate perfect match"

    def test_close_flow_match(self, matcher):
        """Test flow close to range"""
        # Case range: 50-10,000, testing with 25 (just outside but within 2x)
        test_case = {"typical_flow_range": "50–10,000"}
        score, explanation = matcher.calculate_flow_score(25.0, test_case)

        assert 0 < score < 10.0, "Should have positive but non-perfect score"
        assert "close" in explanation.lower() or "scalable" in explanation.lower()

    def test_no_flow_data(self, matcher, sample_cases):
        """Test handling of missing flow data"""
        score, explanation = matcher.calculate_flow_score(None, sample_cases[0])

        assert score == 0.0, "Should have zero score for missing flow"
        assert "no flow" in explanation.lower()


class TestFlowParsing:
    """Test flow range parsing"""

    def test_parse_range(self, matcher):
        """Test parsing of flow ranges"""
        test_cases = [
            ("50–10,000", (50.0, 10000.0)),
            ("100-500", (100.0, 500.0)),
            ("1,000–5,000", (1000.0, 5000.0)),
            ("200", (160.0, 240.0)),  # Single value ±20%
        ]

        for flow_text, expected_range in test_cases:
            result = matcher._parse_flow_range(flow_text)
            assert result is not None, f"Should parse '{flow_text}'"
            assert abs(result[0] - expected_range[0]) < 0.1, f"Min should match for '{flow_text}'"
            assert abs(result[1] - expected_range[1]) < 0.1, f"Max should match for '{flow_text}'"

    def test_parse_invalid_flow(self, matcher):
        """Test handling of invalid flow text"""
        invalid_inputs = ["", "N/A", "varies", "unknown"]

        for flow_text in invalid_inputs:
            result = matcher._parse_flow_range(flow_text)
            assert result is None, f"Should return None for invalid input '{flow_text}'"


# ============================================================================
# INTEGRATION TESTS
# ============================================================================


class TestComprehensiveScoring:
    """Test complete scoring pipeline"""

    def test_score_case_all_factors(self, matcher, sample_cases):
        """Test scoring with all factors present"""
        user_context = UserContext(
            sector="commercial",
            subsector="food_service",
            contaminants={"organics"},
            flow=332.0,
        )

        match_score = matcher.score_case(sample_cases[0], user_context)

        assert isinstance(match_score, MatchScore), "Should return MatchScore object"
        assert match_score.total_score > 0, "Should have positive total score"
        assert match_score.semantic_score > 0, "Should have semantic match"
        assert match_score.contaminant_score > 0, "Should have contaminant match"
        assert match_score.flow_score > 0, "Should have flow match"
        assert len(match_score.explanation) > 0, "Should have explanations"

    def test_score_case_partial_match(self, matcher, sample_cases):
        """Test scoring with only some factors matching"""
        user_context = UserContext(
            sector="residential",
            subsector="single_home",
            contaminants={"organics"},
            flow=5.0,
        )

        match_score = matcher.score_case(sample_cases[1], user_context)  # Municipal

        # Should have some score from contaminants even if semantic is weak
        assert match_score.contaminant_score > 0, "Should match on contaminants"

    def test_explainability(self, matcher, sample_cases):
        """Test that results are explainable"""
        user_context = UserContext(
            sector="commercial",
            subsector="food_service",
            contaminants={"organics", "suspended"},
            flow=332.0,
        )

        match_score = matcher.score_case(sample_cases[0], user_context)

        # Check explanation structure
        assert isinstance(match_score.explanation, list), "Explanation should be a list"
        assert len(match_score.explanation) > 0, "Should have at least one explanation"

        # Check explanation content
        explanation_text = " ".join(match_score.explanation).lower()
        assert any(
            keyword in explanation_text for keyword in ["match", "food", "contaminant", "flow"]
        ), "Explanation should mention key factors"


class TestCaching:
    """Test caching behavior"""

    def test_cache_hit(self, matcher):
        """Test that caching works for identical queries"""
        # First call
        result1 = matcher.find_best_matches(
            sector="commercial",
            subsector="food_service",
            contaminants_tuple=("organics",),
            flow=332.0,
            top_n=3,
        )

        # Second call (should hit cache)
        result2 = matcher.find_best_matches(
            sector="commercial",
            subsector="food_service",
            contaminants_tuple=("organics",),
            flow=332.0,
            top_n=3,
        )

        # Results should be identical
        assert result1 == result2, "Cached results should be identical"

    def test_cache_miss(self, matcher):
        """Test that different queries don't hit cache"""
        result1 = matcher.find_best_matches(
            sector="commercial",
            subsector="food_service",
            contaminants_tuple=("organics",),
            flow=332.0,
            top_n=3,
        )

        result2 = matcher.find_best_matches(
            sector="industrial",
            subsector="textile_manufacturing",
            contaminants_tuple=("color",),
            flow=100.0,
            top_n=3,
        )

        # Results should be different
        assert result1 != result2, "Different queries should produce different results"


# ============================================================================
# EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_empty_user_context(self, matcher, sample_cases):
        """Test handling of empty user context"""
        user_context = UserContext(
            sector="",
            subsector="",
            contaminants=set(),
            flow=None,
        )

        match_score = matcher.score_case(sample_cases[0], user_context)

        # Should still return valid MatchScore, even if score is low
        assert isinstance(match_score, MatchScore), "Should return MatchScore"
        assert match_score.total_score >= 0, "Score should be non-negative"

    def test_new_subsector_auto_adapts(self, matcher, sample_cases):
        """Test that system adapts to new/unknown subsectors"""
        # Use a subsector not in synonyms dictionary
        user_context = UserContext(
            sector="commercial",
            subsector="cafe",  # Not explicitly defined
            contaminants={"organics"},
            flow=50.0,
        )

        # Should still attempt matching via fuzzy/partial matches
        match_score = matcher.score_case(sample_cases[0], user_context)

        # Should not crash and should return valid score
        assert isinstance(match_score, MatchScore), "Should handle unknown subsector"

    def test_unicode_handling(self, matcher):
        """Test handling of Unicode characters in flow ranges"""
        test_case = {
            "id": 1,
            "application_type": "Test",
            "description": "Test",
            "typical_flow_range": "50–10,000",  # En dash (–) not hyphen (-)
            "influent_characteristics": "BOD: 100",
        }

        result = matcher._parse_flow_range(test_case["typical_flow_range"])
        assert result is not None, "Should parse Unicode dash"


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================


class TestPerformance:
    """Test performance characteristics"""

    def test_scoring_speed(self, matcher, sample_cases):
        """Test that scoring is fast enough"""
        import time

        user_context = UserContext(
            sector="commercial",
            subsector="food_service",
            contaminants={"organics"},
            flow=332.0,
        )

        start = time.time()
        for _ in range(100):
            matcher.score_case(sample_cases[0], user_context)
        duration = time.time() - start

        # Should be able to score 100 cases in < 0.1 seconds
        assert duration < 0.1, f"Scoring too slow: {duration:.3f}s for 100 iterations"

    def test_cache_performance(self, matcher):
        """Test that caching provides performance benefit"""
        import time

        # First call (uncached)
        start = time.time()
        matcher.find_best_matches(
            sector="commercial",
            subsector="food_service",
            contaminants_tuple=("organics",),
            flow=332.0,
            top_n=3,
        )
        uncached_duration = time.time() - start

        # Second call (cached)
        start = time.time()
        matcher.find_best_matches(
            sector="commercial",
            subsector="food_service",
            contaminants_tuple=("organics",),
            flow=332.0,
            top_n=3,
        )
        cached_duration = time.time() - start

        # Cached should be significantly faster
        assert cached_duration < uncached_duration * 0.1, (
            f"Cache should be >10x faster (uncached: {uncached_duration:.4f}s, cached: {cached_duration:.4f}s)"
        )


# ============================================================================
# REGRESSION TESTS
# ============================================================================


class TestRegressions:
    """Test specific scenarios that have caused issues"""

    def test_commercial_food_service_match(self, matcher, sample_cases):
        """
        Regression test: commercial/food_service should match Food Processing

        This was the original bug that sparked the V2 rewrite
        """
        user_context = UserContext(
            sector="commercial",
            subsector="food_service",
            contaminants={"organics"},
            flow=332.0,
        )

        match_score = matcher.score_case(sample_cases[0], user_context)  # Food Processing

        # Should have high semantic score (>10)
        assert match_score.semantic_score > 10.0, (
            "food_service should strongly match Food Processing"
        )

        # Should have high total score
        assert match_score.total_score > 25.0, "Total score should be high for good match"

    def test_hotel_matches_hospitality(self, matcher, sample_cases):
        """Test that hotel subsector matches hospitality-related cases"""
        user_context = UserContext(
            sector="commercial",
            subsector="hotel",
            contaminants={"organics"},
            flow=500.0,
        )

        match_score = matcher.score_case(sample_cases[3], user_context)  # Hotel Hospitality

        # Should match via "hotel" or "hospitality"
        assert match_score.semantic_score > 10.0, "hotel should match Hotel Hospitality case"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
