"""Bar chart: RF per-class precision, recall, F1 (from baseline_results.md classification report)."""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

# Random forest — per-class rows from reports/new/baseline_results.md (keep in sync after retraining)
LABELS = ["af", "f", "nf", "r", "si", "st", "w"]
PRECISION = [0.95, 0.98, 0.98, 1.00, 0.98, 0.91, 0.97]
RECALL = [0.90, 0.99, 0.96, 0.98, 0.98, 0.96, 0.98]
F1 = [0.93, 0.99, 0.97, 0.99, 0.98, 0.93, 0.98]


def _label_bars(ax, container, fontsize: int = 6) -> None:
    for bar in container:
        height = bar.get_height()
        ax.annotate(
            f"{height:.2f}",
            xy=(bar.get_x() + bar.get_width() / 2, height),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=fontsize,
        )


def main() -> None:
    out_dir = Path(__file__).resolve().parent
    x = np.arange(len(LABELS))
    width = 0.25

    fig, ax = plt.subplots(figsize=(11, 5.5), dpi=150)
    bars_p = ax.bar(
        x - width, PRECISION, width, label="Precision", color="#2ecc71", edgecolor="white", linewidth=0.5
    )
    bars_r = ax.bar(x, RECALL, width, label="Recall", color="#3498db", edgecolor="white", linewidth=0.5)
    bars_f = ax.bar(x + width, F1, width, label="F1-score", color="#9b59b6", edgecolor="white", linewidth=0.5)

    _label_bars(ax, bars_p)
    _label_bars(ax, bars_r)
    _label_bars(ax, bars_f)

    ax.set_ylabel("Score")
    ax.set_xlabel("Class")
    ax.set_title("Random Forest — per-class precision, recall, and F1\n(test set, session split)")
    ax.set_xticks(x, LABELS)
    ax.set_ylim(0, 1.18)
    ax.axhline(1.0, color="#bdc3c7", linestyle="--", linewidth=0.8, zorder=0)
    ax.legend(loc="lower right", framealpha=0.95)
    ax.grid(axis="y", linestyle=":", alpha=0.5)
    fig.tight_layout()

    out_path = out_dir / "random_forest_per_class_metrics.png"
    fig.savefig(out_path, bbox_inches="tight")
    plt.close()
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
