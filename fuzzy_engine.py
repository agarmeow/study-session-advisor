
# fuzzy_engine.py
# Fuzzy Logic-Based Study Session Advisor
# 27-rule Mamdani-style fuzzy inference engine.

# --------------------------------------------------
# 1. MEMBERSHIP FUNCTIONS
# --------------------------------------------------

def triangular_membership(x, a, b, c):
    """Calculate membership degree in a triangular fuzzy set."""
    if x < a or x > c:
        return 0.0

    if x == b:
        return 1.0

    if x < b:
        return (x - a) / (b - a) if b != a else 1.0

    return (c - x) / (c - b) if c != b else 1.0


def trapezoidal_membership(x, a, b, c, d):
    """Calculate membership degree in a trapezoidal fuzzy set."""
    if x < a or x > d:
        return 0.0

    if b <= x <= c:
        return 1.0

    if x < b:
        return (x - a) / (b - a) if b != a else 1.0

    return (d - x) / (d - c) if d != c else 1.0


# --------------------------------------------------
# 2. FUZZIFICATION
# --------------------------------------------------

def fuzzify_inputs(sleep, workload, energy):
    """Convert crisp inputs into fuzzy membership degrees."""

    return {
        "sleep": {
            "low": trapezoidal_membership(
                sleep, 0, 0, 4, 6
            ),
            "medium": triangular_membership(
                sleep, 4, 7, 10
            ),
            "high": trapezoidal_membership(
                sleep, 8, 10, 12, 12
            ),
        },

        "workload": {
            "light": trapezoidal_membership(
                workload, 0, 0, 2, 4
            ),
            "moderate": triangular_membership(
                workload, 2, 5, 8
            ),
            "heavy": trapezoidal_membership(
                workload, 6, 8, 10, 10
            ),
        },

        "energy": {
            "tired": trapezoidal_membership(
                energy, 0, 0, 2, 4
            ),
            "okay": triangular_membership(
                energy, 2, 5, 8
            ),
            "fresh": trapezoidal_membership(
                energy, 6, 8, 10, 10
            ),
        },
    }


# --------------------------------------------------
# 3. COMPLETE 27-RULE BASE
# --------------------------------------------------

# Format:
# (sleep category, workload category, energy category, output)

RULE_BASE = [
    # LOW SLEEP
    ("low", "light", "tired", "short"),
    ("low", "light", "okay", "short"),
    ("low", "light", "fresh", "medium"),

    ("low", "moderate", "tired", "short"),
    ("low", "moderate", "okay", "short"),
    ("low", "moderate", "fresh", "medium"),

    ("low", "heavy", "tired", "short"),
    ("low", "heavy", "okay", "medium"),
    ("low", "heavy", "fresh", "medium"),

    # MEDIUM SLEEP
    ("medium", "light", "tired", "short"),
    ("medium", "light", "okay", "medium"),
    ("medium", "light", "fresh", "long"),

    ("medium", "moderate", "tired", "short"),
    ("medium", "moderate", "okay", "medium"),
    ("medium", "moderate", "fresh", "long"),

    ("medium", "heavy", "tired", "medium"),
    ("medium", "heavy", "okay", "medium"),
    ("medium", "heavy", "fresh", "long"),

    # HIGH SLEEP
    ("high", "light", "tired", "short"),
    ("high", "light", "okay", "medium"),
    ("high", "light", "fresh", "long"),

    ("high", "moderate", "tired", "medium"),
    ("high", "moderate", "okay", "long"),
    ("high", "moderate", "fresh", "long"),

    ("high", "heavy", "tired", "medium"),
    ("high", "heavy", "okay", "long"),
    ("high", "heavy", "fresh", "long"),
]


# Every rule initially has weight 1.0.
# This can be adjusted later after baseline testing.
RULE_WEIGHTS = {
    index: 1.0
    for index in range(1, len(RULE_BASE) + 1)
}


def evaluate_rules(memberships):
    """
    Evaluate all 27 rules using the minimum operator for AND.

    Returns the same three-item tuple structure as before:
    (description, firing_strength, output_category)
    """

    rules = []

    for index, rule in enumerate(RULE_BASE, start=1):
        sleep_category, workload_category, energy_category, output = rule

        sleep_degree = memberships["sleep"][sleep_category]
        workload_degree = memberships["workload"][workload_category]
        energy_degree = memberships["energy"][energy_category]

        # Mamdani AND operator: minimum of input memberships.
        raw_strength = min(
            sleep_degree,
            workload_degree,
            energy_degree,
        )

        # Apply the rule's weight.
        weight = RULE_WEIGHTS[index]
        firing_strength = raw_strength * weight

        description = (
            f"Sleep {sleep_category} AND "
            f"workload {workload_category} AND "
            f"energy {energy_category} -> "
            f"{output.capitalize()}"
        )

        rules.append(
            (description, firing_strength, output)
        )

    return rules


# --------------------------------------------------
# 4. MAMDANI AGGREGATION AND CENTROID DEFUZZIFICATION
# --------------------------------------------------

def infer_study_duration(sleep, workload, energy):
    """
    Perform fuzzification, 27-rule evaluation,
    output aggregation, and centroid defuzzification.
    """

    # Validate crisp inputs.
    if not 0 <= sleep <= 12:
        raise ValueError("Sleep must be between 0 and 12 hours.")

    if not 0 <= workload <= 10:
        raise ValueError("Workload must be between 0 and 10.")

    if not 0 <= energy <= 10:
        raise ValueError("Energy must be between 0 and 10.")

    memberships = fuzzify_inputs(
        sleep, workload, energy
    )

    rules = evaluate_rules(memberships)

    # Output universe: integer study durations, 15 to 90 minutes.
    durations = list(range(15, 91))

    output_sets = {
        "short": lambda x: trapezoidal_membership(
            x, 15, 15, 25, 40
        ),

        "medium": lambda x: triangular_membership(
            x, 30, 52, 74
        ),

        "long": lambda x: trapezoidal_membership(
            x, 60, 75, 90, 90
        ),
    }

    aggregated = []

    for duration in durations:
        clipped_outputs = []

        for _, firing_strength, category in rules:
            output_membership = output_sets[category](duration)

            # Clip the consequent using the rule firing strength.
            clipped_outputs.append(
                min(firing_strength, output_membership)
            )

        # Aggregate all rules using maximum.
        aggregated.append(
            max(clipped_outputs, default=0.0)
        )

    total_membership = sum(aggregated)

    # Do not silently hide a coverage failure with a fallback.
    if total_membership == 0:
        raise RuntimeError(
            "No fuzzy output was produced. "
            "Inspect the membership functions and rule base."
        )

    # Discrete centroid of area.
    recommendation = (
        sum(
            duration * degree
            for duration, degree in zip(durations, aggregated)
        )
        / total_membership
    )

    return {
        "duration": round(recommendation),
        "memberships": memberships,
        "rules": sorted(
            rules,
            key=lambda rule: rule[1],
            reverse=True,
        ),
        "aggregated_output": list(zip(durations, aggregated)),
    }


# --------------------------------------------------
# 5. BASIC COVERAGE CHECKS
# --------------------------------------------------

def check_rule_base():
    """Check rule count, duplicate conditions and input coverage."""

    expected_rule_count = 27

    conditions = [
        (sleep, workload, energy)
        for sleep, workload, energy, _ in RULE_BASE
    ]

    if len(RULE_BASE) != expected_rule_count:
        raise AssertionError(
            f"Expected 27 rules, found {len(RULE_BASE)}."
        )

    if len(set(conditions)) != expected_rule_count:
        raise AssertionError(
            "Duplicate rule conditions were found."
        )

    # Test a grid of numeric inputs, including boundaries.
    test_sleeps = [0, 2, 4, 5, 6, 7, 8, 10, 12]
    test_workloads = [0, 1, 2, 4, 5, 6, 8, 9, 10]
    test_energies = [0, 1, 2, 4, 5, 6, 8, 9, 10]

    tested = 0

    for sleep in test_sleeps:
        for workload in test_workloads:
            for energy in test_energies:
                memberships = fuzzify_inputs(
                    sleep, workload, energy
                )

                rules = evaluate_rules(memberships)

                if not any(strength > 0 for _, strength, _ in rules):
                    raise AssertionError(
                        "Zero rule coverage at "
                        f"sleep={sleep}, workload={workload}, "
                        f"energy={energy}"
                    )

                result = infer_study_duration(
                    sleep, workload, energy
                )

                if not 15 <= result["duration"] <= 90:
                    raise AssertionError(
                        "Output outside 15-90 minute range."
                    )

                tested += 1

    return {
        "rule_count": len(RULE_BASE),
        "unique_conditions": len(set(conditions)),
        "numeric_cases_tested": tested,
    }


# --------------------------------------------------
# 6. RUN DIRECTLY FROM THE TERMINAL
# --------------------------------------------------

if __name__ == "__main__":
    result = infer_study_duration(
        sleep=7,
        workload=5,
        energy=6,
    )

    print("Fuzzy Study Session Advisor")
    print("=" * 40)
    print("Number of rules:", len(RULE_BASE))
    print("Recommended duration:", result["duration"], "minutes")

    print("\nInput memberships:")
    for variable, sets in result["memberships"].items():
        print(f"{variable.capitalize()}: {sets}")

    print("\nTop 5 activated rules:")
    for description, strength, category in result["rules"][:5]:
        if strength > 0:
            print(f"{description} | strength={strength:.3f}")

    print("\nRunning rule-base and coverage checks...")
    print(check_rule_base())
