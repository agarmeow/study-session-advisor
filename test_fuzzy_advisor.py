
import pytest

from fuzzy_advisor import infer_study_advice


def test_returns_all_four_outputs():
    result = infer_study_advice(7, 5, 2, 6)

    assert 15 <= result["study_minutes"] <= 90
    assert 5 <= result["break_minutes"] <= 20
    assert result["intensity"] in {
        "Light revision",
        "Moderate study",
        "Challenging material",
    }
    assert result["rest_needed"] in {"Low", "Medium", "High"}


@pytest.mark.parametrize(
    "sleep,energy,deadline,difficulty",
    [
        (2, 1, 0, 9),
        (5, 5, 2, 5),
        (9, 9, 10, 3),
        (7, 8, 1, 10),
    ],
)
def test_recommendations_are_bounded(sleep, energy, deadline, difficulty):
    result = infer_study_advice(sleep, energy, deadline, difficulty)

    assert 15 <= result["study_minutes"] <= 90
    assert 5 <= result["break_minutes"] <= 20
    assert result["fired_rules"]


def test_invalid_input_is_rejected():
    with pytest.raises(ValueError):
        infer_study_advice(15, 5, 2, 6)
    with pytest.raises(ValueError):
        infer_study_advice(7, -1, 2, 6)
    with pytest.raises(ValueError):
        infer_study_advice("seven", 5, 2, 6)


def test_drained_student_receives_light_revision_and_high_rest():
    """Scenario 1: Slept 4 hours, drained, deadline today, difficult topic."""
    result = infer_study_advice(
        sleep_hours=4,
        energy=1,
        days_to_deadline=0,
        difficulty=8,
    )
    assert result["intensity"] == "Light revision"
    assert result["rest_needed"] == "High"
    assert 15 <= result["study_minutes"] <= 45
    assert 10 <= result["break_minutes"] <= 20


def test_energized_student_receives_challenging_material():
    """Scenario 2: Well-rested, energized, urgent deadline, difficult topic."""
    result = infer_study_advice(
        sleep_hours=9,
        energy=9,
        days_to_deadline=0,
        difficulty=9,
    )
    assert result["intensity"] == "Challenging material"
    assert result["rest_needed"] == "Low"
    assert result["study_minutes"] >= 60


def test_moderate_student_receives_valid_durations():
    """Scenario 3: Moderate sleep, energy, urgency, difficulty."""
    result = infer_study_advice(
        sleep_hours=7,
        energy=5,
        days_to_deadline=3,
        difficulty=5,
    )
    assert 15 <= result["study_minutes"] <= 90
    assert 5 <= result["break_minutes"] <= 20
    assert result["intensity"] in {"Light revision", "Moderate study", "Challenging material"}
    assert result["rest_needed"] in {"Low", "Medium", "High"}


@pytest.mark.parametrize(
    "sleep,energy,deadline,difficulty",
    [
        (0, 0, 0, 0),
        (0, 10, 0, 10),
        (12, 0, 30, 0),
        (12, 10, 30, 10),
        (6, 5, 15, 5),
    ],
)
def test_boundary_inputs(sleep, energy, deadline, difficulty):
    result = infer_study_advice(sleep, energy, deadline, difficulty)
    assert 15 <= result["study_minutes"] <= 90
    assert 5 <= result["break_minutes"] <= 20
    assert result["fired_rules"]


def test_deterministic_outputs():
    result1 = infer_study_advice(6.5, 4.5, 2.0, 7.0)
    result2 = infer_study_advice(6.5, 4.5, 2.0, 7.0)
    assert result1 == result2


def test_rule_base_has_81_unique_rules():
    from fuzzy_advisor import RULES
    assert len(RULES) == 81
    antecedents = [r[:4] for r in RULES]
    assert len(set(antecedents)) == 81

