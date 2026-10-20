
# fuzzy_engine.py
# Fuzzy Logic-Based Study Session Advisor
# Implements membership functions and fuzzy inference manually.


def triangular_membership(x, a, b, c):
    """Calculate membership in a triangular fuzzy set."""
    if x < a or x > c:
        return 0.0
    if x == b:
        return 1.0
    if x < b:
        return (x - a) / (b - a) if b != a else 1.0
    return (c - x) / (c - b) if c != b else 1.0


def trapezoidal_membership(x, a, b, c, d):
    """Calculate membership in a trapezoidal fuzzy set."""
    if x < a or x > d:
        return 0.0
    if b <= x <= c:
        return 1.0
    if x < b:
        return (x - a) / (b - a) if b != a else 1.0
    return (d - x) / (d - c) if d != c else 1.0


def fuzzify_inputs(sleep, workload, energy):
    """Convert crisp inputs into fuzzy membership degrees."""

    return {
        "sleep": {
            "low": trapezoidal_membership(sleep, 0, 0, 4, 6),
            "medium": triangular_membership(sleep, 4, 7, 10),
            "high": trapezoidal_membership(sleep, 8, 10, 12, 12),
        },
        "workload": {
            "light": trapezoidal_membership(workload, 0, 0, 2, 4),
            "moderate": triangular_membership(workload, 2, 5, 8),
            "heavy": trapezoidal_membership(workload, 6, 8, 10, 10),
        },
        "energy": {
            "tired": trapezoidal_membership(energy, 0, 0, 2, 4),
            "okay": triangular_membership(energy, 2, 5, 8),
            "fresh": trapezoidal_membership(energy, 6, 8, 10, 10),
        },
    }


def evaluate_rules(memberships):
    """Evaluate Mamdani-style rules and return their firing strengths."""

    s = memberships["sleep"]
    w = memberships["workload"]
    e = memberships["energy"]

    # Each rule is: (description, firing strength, output category)
    rules = [
        ("Low sleep AND tired energy -> Short", min(s["low"], e["tired"]), "short"),
        ("Low sleep AND okay energy -> Short", min(s["low"], e["okay"]), "short"),
        ("Low sleep AND fresh energy -> Medium", min(s["low"], e["fresh"]), "medium"),
        ("Medium sleep AND tired energy -> Short", min(s["medium"], e["tired"]), "short"),
        ("Medium sleep AND okay energy -> Medium", min(s["medium"], e["okay"]), "medium"),
        ("Medium sleep AND fresh energy -> Long", min(s["medium"], e["fresh"]), "long"),
        ("High sleep AND tired energy -> Medium", min(s["high"], e["tired"]), "medium"),
        ("High sleep AND okay energy -> Long", min(s["high"], e["okay"]), "long"),
        ("High sleep AND fresh energy -> Long", min(s["high"], e["fresh"]), "long"),
        ("Heavy workload AND fresh energy -> Long", min(w["heavy"], e["fresh"]), "long"),
        ("Heavy workload AND tired energy -> Medium", min(w["heavy"], e["tired"]), "medium"),
        ("Light workload AND tired energy -> Short", min(w["light"], e["tired"]), "short"),
        ("Moderate workload AND medium sleep -> Medium", min(w["moderate"], s["medium"]), "medium"),
    ]

    return rules


def infer_study_duration(sleep, workload, energy):
    """
    Run fuzzification, rule evaluation, aggregation,
    and centroid defuzzification.
    """

    memberships = fuzzify_inputs(sleep, workload, energy)
    rules = evaluate_rules(memberships)

    # Output universe: study durations from 15 to 90 minutes.
    # The output fuzzy sets are sampled at one-minute intervals.
    durations = list(range(15, 91))
    aggregated = []

    output_sets = {
        "short": lambda x: trapezoidal_membership(x, 15, 15, 25, 40),
        "medium": lambda x: triangular_membership(x, 30, 52, 74),
        "long": lambda x: trapezoidal_membership(x, 60, 75, 90, 90),
    }

    for duration in durations:
        strengths = []

        for _, firing_strength, category in rules:
            # Clip each output set at its rule's firing strength.
            set_membership = output_sets[category](duration)
            strengths.append(min(firing_strength, set_membership))

        # Aggregate all rule outputs using the maximum operator.
        aggregated.append(max(strengths, default=0.0))

    total_membership = sum(aggregated)

    if total_membership == 0:
        # Neutral fallback for inputs where no rule fires.
        recommendation = 45.0
    else:
        # Discrete centroid of area.
        recommendation = (
            sum(x * mu for x, mu in zip(durations, aggregated))
            / total_membership
        )

    # Return the recommendation and details for the interface.
    return {
        "duration": round(recommendation),
        "memberships": memberships,
        "rules": sorted(rules, key=lambda rule: rule[1], reverse=True),
        "aggregated_output": list(zip(durations, aggregated)),
    }


if __name__ == "__main__":
    result = infer_study_duration(
        sleep=7,
        workload=5,
        energy=6,
    )

    print("Study Session Advisor")
    print("-" * 30)
    print("Recommended duration:", result["duration"], "minutes")

    print("\nInput memberships:")
    for variable, sets in result["memberships"].items():
        print(f"{variable.capitalize()}: {sets}")

    print("\nMost strongly activated rules:")
    for description, strength, category in result["rules"][:5]:
        if strength > 0:
            print(f"{description} (strength={strength:.2f})")
