
"""Fuzzy Study Advisor.

Uses Mamdani-style fuzzy inference with min rule firing,
max aggregation and centroid defuzzification.

All rules and thresholds are design assumptions for study planning,
not scientifically validated or medical recommendations.
"""

from itertools import product


# --------------------------------------------------
# 1. MEMBERSHIP FUNCTIONS
# --------------------------------------------------

def triangular(x, a, b, c):
    """Triangular membership function."""
    if not a <= b <= c:
        raise ValueError("Expected a <= b <= c.")

    if x < a or x > c:
        return 0.0
    if x == b:
        return 1.0
    if x < b:
        return (x - a) / (b - a) if b > a else 1.0
    return (c - x) / (c - b) if c > b else 1.0


def trapezoidal(x, a, b, c, d):
    """Trapezoidal membership function."""
    if not a <= b <= c <= d:
        raise ValueError("Expected a <= b <= c <= d.")

    if x < a or x > d:
        return 0.0
    if b <= x <= c:
        return 1.0
    if x < b:
        return (x - a) / (b - a) if b > a else 1.0
    return (d - x) / (d - c) if d > c else 1.0


# --------------------------------------------------
# 2. FUZZIFICATION
# --------------------------------------------------

def fuzzy_sleep(hours):
    return {
        "low": trapezoidal(hours, 0, 0, 4, 6),
        "medium": triangular(hours, 4, 7, 9),
        "high": trapezoidal(hours, 7, 9, 12, 12),
    }


def fuzzy_energy(energy):
    return {
        "drained": trapezoidal(energy, 0, 0, 2, 4),
        "okay": triangular(energy, 2, 5, 8),
        "energized": trapezoidal(energy, 6, 8, 10, 10),
    }


def fuzzy_urgency(days):
    """Urgency is represented by days until the nearest deadline."""
    return {
        "imminent": trapezoidal(days, 0, 0, 0.5, 1.5),
        "near": triangular(days, 0.5, 3, 7),
        "far": trapezoidal(days, 5, 10, 30, 30),
    }


def fuzzy_difficulty(difficulty):
    return {
        "easy": trapezoidal(difficulty, 0, 0, 2, 4),
        "medium": triangular(difficulty, 2, 5, 8),
        "hard": trapezoidal(difficulty, 6, 8, 10, 10),
    }


# --------------------------------------------------
# 3. RULE BASE
# --------------------------------------------------

# Each rule contains:
# (sleep, energy, urgency, difficulty,
#  study_minutes, break_minutes, intensity_score, rest_score)
#
# The 81 rules cover every combination of the four
# linguistic input categories.

def build_rule_base():
    rules = []

    categories = [
        ("low", "medium", "high"),
        ("drained", "okay", "energized"),
        ("imminent", "near", "far"),
        ("easy", "medium", "hard"),
    ]

    sleep_level = {"low": 0, "medium": 1, "high": 2}
    energy_level = {"drained": 0, "okay": 1, "energized": 2}
    urgency_level = {"imminent": 2, "near": 1, "far": 0}
    difficulty_level = {"easy": 0, "medium": 1, "hard": 2}

    for sleep, energy, urgency, difficulty in product(*categories):
        s = sleep_level[sleep]
        e = energy_level[energy]
        u = urgency_level[urgency]
        d = difficulty_level[difficulty]

        # Study duration: energy and sleep are important constraints.
        study = (
            25
            + 8 * s
            + 10 * e
            + 4 * u
            + 4 * d
        )
        if e == 0:
            study -= 8
        if s == 0:
            study -= 5

        study = max(15, min(75, study))

        # Breaks are longer when energy or sleep is low.
        pause = 5 + 3 * (2 - e) + 2 * (2 - s)
        pause = max(5, min(15, pause))

        # Intensity is limited when energy is low or sleep is low.
        intensity = 2 + 2 * e + s + d
        if e == 0:
            intensity = min(intensity, 3)
        if s == 0:
            intensity = min(intensity, 5)
        intensity = max(1, min(9, intensity))

        # Rest-needed score is a gentle planning indicator.
        rest = 2 + 2 * (2 - e) + 2 * (2 - s)
        rest = max(1, min(10, rest))

        rules.append((
            sleep, energy, urgency, difficulty,
            study, pause, intensity, rest,
        ))

    return rules


RULES = build_rule_base()


# --------------------------------------------------
# 4. CENTROID DEFUZZIFICATION
# --------------------------------------------------

def centroid(activated_sets, universe):
    """Aggregate clipped triangular output sets using max,
    then calculate the discrete centroid.
    """
    aggregated = []

    for x in universe:
        degree = 0.0

        for center, width, strength in activated_sets:
            if width <= 0:
                raise ValueError("Output membership width must be positive.")

            membership = max(0.0, 1.0 - abs(x - center) / width)
            degree = max(degree, min(strength, membership))

        aggregated.append(degree)

    denominator = sum(aggregated)

    if denominator == 0:
        raise ValueError("No fuzzy output membership was activated.")

    return sum(
        x * degree for x, degree in zip(universe, aggregated)
    ) / denominator


# --------------------------------------------------
# 5. FUZZY INFERENCE
# --------------------------------------------------

def infer_study_advice(
    sleep_hours,
    energy,
    days_to_deadline,
    difficulty,
):
    """Calculate personalized study recommendations.

    Inputs:
        sleep_hours: 0 to 12 hours
        energy: 0 to 10, where lower means drained
        days_to_deadline: 0 to 30 days
        difficulty: 0 to 10

    Returns:
        Study duration, break duration, intensity,
        rest-needed level and fired rules.
    """

    inputs_to_check = [
        ("Sleep hours", sleep_hours, 0, 12),
        ("Energy", energy, 0, 10),
        ("Days to deadline", days_to_deadline, 0, 30),
        ("Difficulty", difficulty, 0, 10),
    ]

    for name, value, lower, upper in inputs_to_check:
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError(f"{name} must be a number.")
        if not lower <= value <= upper:
            raise ValueError(f"{name} must be between {lower} and {upper}.")

    memberships = [
        fuzzy_sleep(sleep_hours),
        fuzzy_energy(energy),
        fuzzy_urgency(days_to_deadline),
        fuzzy_difficulty(difficulty),
    ]

    study_sets = []
    break_sets = []
    intensity_sets = []
    rest_sets = []
    fired_rules = []

    for rule in RULES:
        sleep_set, energy_set, urgency_set, difficulty_set = rule[:4]

        strength = min(
            memberships[0][sleep_set],
            memberships[1][energy_set],
            memberships[2][urgency_set],
            memberships[3][difficulty_set],
        )

        if strength <= 0:
            continue

        study, pause, intensity, rest = rule[4:]

        study_sets.append((study, 18, strength))
        break_sets.append((pause, 5, strength))
        intensity_sets.append((intensity, 2.5, strength))
        rest_sets.append((rest, 2.5, strength))

        fired_rules.append({
            "rule": rule,
            "strength": round(strength, 3),
        })

    if not fired_rules:
        raise ValueError(
            "No fuzzy rules fired. Check membership coverage and rules."
        )

    study_minutes = round(
        centroid(study_sets, range(15, 91))
    )
    break_minutes = round(
        centroid(break_sets, range(5, 21))
    )
    intensity_score = centroid(intensity_sets, range(11))
    rest_score = centroid(rest_sets, range(11))

    if intensity_score < 3.5:
        intensity = "Light revision"
    elif intensity_score < 7:
        intensity = "Moderate study"
    else:
        intensity = "Challenging material"

    if rest_score < 3.5:
        rest_needed = "Low"
    elif rest_score < 7:
        rest_needed = "Medium"
    else:
        rest_needed = "High"

    return {
        "study_minutes": study_minutes,
        "break_minutes": break_minutes,
        "intensity": intensity,
        "intensity_score": round(intensity_score, 2),
        "rest_needed": rest_needed,
        "rest_score": round(rest_score, 2),
        "fired_rules": sorted(
            fired_rules,
            key=lambda item: item["strength"],
            reverse=True,
        ),
    }


# --------------------------------------------------
# 6. RULE-BASE AND NUMERIC COVERAGE CHECK
# --------------------------------------------------

def check_rule_coverage():
    """Test that the rule base is complete and inputs activate rules."""

    expected = 3 ** 4
    antecedents = [rule[:4] for rule in RULES]

    if len(RULES) != expected:
        raise AssertionError(
            f"Expected {expected} rules, found {len(RULES)}."
        )

    if len(set(antecedents)) != expected:
        raise AssertionError("Duplicate or missing rule conditions detected.")

    total = 0
    failures = []

    test_values = product(
        [i * 0.5 for i in range(25)],  # Sleep: 0 to 12
        [i * 0.5 for i in range(21)],  # Energy: 0 to 10
        [0, 0.5, 1, 2, 4, 7, 14, 30],
        [i * 0.5 for i in range(21)],  # Difficulty: 0 to 10
    )

    for sleep, energy, deadline, difficulty in test_values:
        total += 1
        try:
            infer_study_advice(sleep, energy, deadline, difficulty)
        except ValueError as error:
            failures.append(
                (sleep, energy, deadline, difficulty, str(error))
            )

    return {
        "rule_count": len(RULES),
        "unique_conditions": len(set(antecedents)),
        "numeric_cases_tested": total,
        "failed_cases": len(failures),
        "failure_examples": failures[:10],
    }


if __name__ == "__main__":
    example = infer_study_advice(
        sleep_hours=4,
        energy=2,
        days_to_deadline=0,
        difficulty=8,
    )

    print("Example recommendation:")
    print(example)

    print("\nCoverage report:")
    print(check_rule_coverage())
