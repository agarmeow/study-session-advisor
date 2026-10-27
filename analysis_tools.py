
# analysis_tools.py
# Analytical visualizations for the fuzzy study advisor.

from fuzzy_engine import fuzzify_inputs, evaluate_rules, infer_study_duration


def calculate_coverage(sleep, workload, energy):
    """
    Return the maximum rule firing strength for one input combination.
    """
    memberships = fuzzify_inputs(sleep, workload, energy)
    rules = evaluate_rules(memberships)

    return max(
        (strength for _, strength, _ in rules),
        default=0.0,
    )


def calculate_recommendation(sleep, workload, energy):
    """Return the crisp study-duration recommendation."""
    return infer_study_duration(
        sleep, workload, energy
    )["duration"]


def generate_heatmap_data(fixed_workload=5, step=0.5):
    """
    Generate data for heatmaps across sleep and energy.

    Returns:
        sleep_values: sampled sleep values
        energy_values: sampled energy values
        coverage: matrix of maximum rule firing strengths
        durations: matrix of recommended study durations
    """
    if not 0 <= fixed_workload <= 10:
        raise ValueError("Workload must be between 0 and 10.")

    if step <= 0:
        raise ValueError("Step must be positive.")

    count_sleep = round(12 / step)
    count_energy = round(10 / step)

    sleep_values = [
        i * step for i in range(count_sleep + 1)
    ]
    energy_values = [
        i * step for i in range(count_energy + 1)
    ]

    coverage = []
    durations = []

    for energy in energy_values:
        coverage_row = []
        duration_row = []

        for sleep in sleep_values:
            coverage_row.append(
                calculate_coverage(
                    sleep, fixed_workload, energy
                )
            )

            duration_row.append(
                calculate_recommendation(
                    sleep, fixed_workload, energy
                )
            )

        coverage.append(coverage_row)
        durations.append(duration_row)

    return {
        "sleep_values": sleep_values,
        "energy_values": energy_values,
        "coverage": coverage,
        "durations": durations,
        "fixed_workload": fixed_workload,
    }
