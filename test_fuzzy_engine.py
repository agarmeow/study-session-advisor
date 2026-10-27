
# test_fuzzy_engine.py

import pytest

from fuzzy_engine import (
    RULE_BASE,
    fuzzify_inputs,
    infer_study_duration,
    check_rule_base,
)


def test_rule_count():
    assert len(RULE_BASE) == 27


def test_all_rule_conditions_are_unique():
    conditions = [
        (sleep, workload, energy)
        for sleep, workload, energy, output in RULE_BASE
    ]

    assert len(conditions) == len(set(conditions))


@pytest.mark.parametrize(
    "sleep, workload, energy",
    [
        (0, 0, 0),
        (3, 5, 2),
        (7, 5, 6),
        (9, 4, 9),
        (12, 10, 10),
        (5, 8, 4),
        (8, 2, 7),
    ],
)
def test_recommendation_is_within_valid_range(
    sleep, workload, energy
):
    result = infer_study_duration(sleep, workload, energy)

    assert 15 <= result["duration"] <= 90


def test_recommendation_has_aggregated_output():
    result = infer_study_duration(7, 5, 6)

    assert len(result["aggregated_output"]) == 76
    assert any(
        membership > 0
        for _, membership in result["aggregated_output"]
    )


def test_memberships_are_between_zero_and_one():
    memberships = fuzzify_inputs(7, 5, 6)

    for variable in memberships.values():
        for degree in variable.values():
            assert 0 <= degree <= 1


def test_invalid_inputs_are_rejected():
    with pytest.raises(ValueError):
        infer_study_duration(-1, 5, 5)

    with pytest.raises(ValueError):
        infer_study_duration(7, 11, 5)

    with pytest.raises(ValueError):
        infer_study_duration(7, 5, 11)


def test_numeric_coverage_grid():
    result = check_rule_base()

    assert result["rule_count"] == 27
    assert result["unique_conditions"] == 27
    assert result["numeric_cases_tested"] == 729
