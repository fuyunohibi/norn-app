#!/usr/bin/env python3
"""Bar chart: window counts per activity class."""

import argparse
from pathlib import Path
from typing import Dict, List, Sequence

import matplotlib.pyplot as plt
import numpy as np

# Canonical class order (matches confusion matrices / reports)
LABEL_ORDER: List[str] = ["af", "f", "nf", "r", "si", "st", "w"]

DISPLAY: Dict[str, str] = {
    "af": "After fall",
    "f": "Falling",
    "nf": "Near fall",
    "r": "Running",
    "si": "Sitting",
    "st": "Standing",
    "w": "Walking",
}

# Recorded-combined corpus (pre-augmentation), train+test windows
COUNTS_BASELINE = [2352, 182, 2028, 315, 24665, 9647, 4444]

# Recorded + synthetic augmentation (from same pipeline as reports/new/)
COUNTS_AUGMENTED = [14096, 12131, 13846, 12204, 24665, 9647, 16324]


def save_window_counts_figure(
    labels: Sequence[str],
    counts: Sequence[int],
    output_path: Path,
    title: str = "Window counts per class (seven categories)",
) -> None:
    """Write a bar chart PNG; `labels` and `counts` must align."""
    if len(labels) != len(counts):
        raise ValueError("labels and counts length mismatch")
    x = np.arange(len(labels))
    c = list(counts)
    fig, ax = plt.subplots(figsize=(9, 5), dpi=150)
    bars = ax.bar(x, c, color="#2c5282", edgecolor="#1a365d", linewidth=0.6)
    ax.set_xticks(x)
    ax.set_xticklabels([f"{DISPLAY.get(lab, lab)}\n({lab})" for lab in labels], fontsize=9)
    ax.set_ylabel("Number of windows")
    ax.set_title(title)
    ax.yaxis.grid(True, linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    ymax = max(c) if c else 1
    for b, n in zip(bars, c):
        ax.text(
            b.get_x() + b.get_width() / 2,
            b.get_height() + ymax * 0.01,
            f"{n:,}",
            ha="center",
            va="bottom",
            fontsize=8,
        )
    fig.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, bbox_inches="tight")
    plt.close()
    print(f"Wrote {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Plot window counts per class")
    parser.add_argument(
        "--preset",
        choices=("baseline", "augmented"),
        default="baseline",
        help="baseline → reports/ ; augmented → reports/new/",
    )
    args = parser.parse_args()

    repo = Path(__file__).resolve().parents[1]
    if args.preset == "baseline":
        out = repo / "reports" / "window_counts_per_class.png"
        title = "Window counts per class (seven categories)"
        counts = COUNTS_BASELINE
    else:
        out = repo / "reports" / "new" / "window_counts_per_class.png"
        title = "Window counts per class (seven categories)"
        counts = COUNTS_AUGMENTED

    save_window_counts_figure(LABEL_ORDER, counts, out, title=title)


if __name__ == "__main__":
    main()
