
# plots.py
# Visualize fuzzy membership functions without NumPy or scikit-fuzzy.

import matplotlib.pyplot as plt

from fuzzy_engine import (
    triangular_membership,
    trapezoidal_membership,
)


def plot_membership_functions():
    x_sleep = list(range(13))
    x_scale = list(range(11))

    sleep_sets = {
        "Low": [trapezoidal_membership(x, 0, 0, 4, 6) for x in x_sleep],
        "Medium": [triangular_membership(x, 4, 7, 10) for x in x_sleep],
        "High": [trapezoidal_membership(x, 8, 10, 12, 12) for x in x_sleep],
    }

    workload_sets = {
        "Light": [trapezoidal_membership(x, 0, 0, 2, 4) for x in x_scale],
        "Moderate": [triangular_membership(x, 2, 5, 8) for x in x_scale],
        "Heavy": [trapezoidal_membership(x, 6, 8, 10, 10) for x in x_scale],
    }

    energy_sets = {
        "Tired": [trapezoidal_membership(x, 0, 0, 2, 4) for x in x_scale],
        "Okay": [triangular_membership(x, 2, 5, 8) for x in x_scale],
        "Fresh": [trapezoidal_membership(x, 6, 8, 10, 10) for x in x_scale],
    }

    fig, axes = plt.subplots(3, 1, figsize=(9, 10))

    for label, values in sleep_sets.items():
        axes[0].plot(x_sleep, values, marker="o", label=label)
    axes[0].set_title("Sleep Membership Functions")
    axes[0].set_xlabel("Sleep (hours)")
    axes[0].set_ylabel("Membership Degree")
    axes[0].set_ylim(-0.05, 1.05)
    axes[0].legend()
    axes[0].grid(True)

    for label, values in workload_sets.items():
        axes[1].plot(x_scale, values, marker="o", label=label)
    axes[1].set_title("Workload Membership Functions")
    axes[1].set_xlabel("Workload (0–10)")
    axes[1].set_ylim(-0.05, 1.05)
    axes[1].legend()
    axes[1].grid(True)

    for label, values in energy_sets.items():
        axes[2].plot(x_scale, values, marker="o", label=label)
    axes[2].set_title("Energy Membership Functions")
    axes[2].set_xlabel("Energy (0–10)")
    axes[2].set_ylim(-0.05, 1.05)
    axes[2].legend()
    axes[2].grid(True)

    fig.tight_layout(pad=2.0)
    plt.show()


if __name__ == "__main__":
    plot_membership_functions()
