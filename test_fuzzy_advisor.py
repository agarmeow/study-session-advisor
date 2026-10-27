
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
