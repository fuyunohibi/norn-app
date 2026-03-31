# IMU Fall/Activity Detection — Training results

Generated: 2026-03-29 20:26:22

## Label reference

| Abbrev | Full name | Description |
|--------|-----------|-------------|
| **af** | after fall | On floor after fall (needs help) |
| **f** | falling | Active fall in progress |
| **nf** | near fall | Unstable standing (early warning) |
| **r** | running | Running/jogging |
| **si** | sitting | Seated position |
| **st** | standing | Normal standing position |
| **w** | walking | Walking/moving |

## Dataset summary

| Metric | Value |
|--------|-------|
| Sessions (total) | 300 |
| Recorded sessions | 158 |
| Synthetic sessions | 142 |
| Samples | 1,523,946 |
| Total windows | 60,484 |
| Window size | 1.0 s |
| Window step | 0.5 s (50% overlap) |
| Features | 32 |
| Train / test split | 70% / 30% by session |

### Window distribution by label (all windows)

| Label | Windows |
|-------|--------:|
| af | 5,817 |
| f | 3,629 |
| nf | 5,319 |
| r | 3,646 |
| si | 24,665 |
| st | 9,647 |
| w | 7,761 |

## Session split

- Train sessions (210)
- Test sessions (90)

## Model comparison

| Model | Accuracy | Macro F1 | Weighted F1 |
|-------|----------|----------|-------------|
| Logistic regression | 86.32% | 0.87 | 0.86 |
| **Random forest** | **96.78%** | **0.97** | **0.97** |

## Logistic regression

**Overall accuracy:** 0.8632 (86.32%)

### Classification report

```
              precision    recall  f1-score   support

          af       0.87      0.82      0.84      1466
           f       0.98      0.99      0.98      1119
          nf       0.94      0.81      0.87      2040
           r       1.00      0.98      0.99       591
          si       0.85      0.97      0.91      8514
          st       0.70      0.51      0.59      3001
           w       0.92      0.92      0.92      2287

    accuracy                           0.86     19018
   macro avg       0.89      0.86      0.87     19018
weighted avg       0.86      0.86      0.86     19018

```

### Confusion matrix

Labels: ['af', 'f', 'nf', 'r', 'si', 'st', 'w']

```
[[1198    5    5    0  112  130   16]
 [   5 1105    3    0    0    3    3]
 [  18   15 1647    1   33  275   51]
 [   0    1    7  578    0    1    4]
 [  29    0   11    0 8246  178   50]
 [  98    2   58    0 1264 1527   52]
 [  32    1   13    0   46   80 2115]]
```

## Random forest

**Overall accuracy:** 0.9678 (96.78%)

### Classification report

```
              precision    recall  f1-score   support

          af       0.95      0.90      0.93      1466
           f       0.98      0.99      0.99      1119
          nf       0.98      0.96      0.97      2040
           r       1.00      0.98      0.99       591
          si       0.98      0.98      0.98      8514
          st       0.91      0.96      0.93      3001
           w       0.97      0.98      0.98      2287

    accuracy                           0.97     19018
   macro avg       0.97      0.96      0.97     19018
weighted avg       0.97      0.97      0.97     19018

```

### Confusion matrix

Labels: ['af', 'f', 'nf', 'r', 'si', 'st', 'w']

```
[[1323    5    2    0   48   88    0]
 [   5 1109    3    0    0    2    0]
 [   8    7 1962    2   25   19   17]
 [   0    3    7  577    0    1    3]
 [   6    0   24    0 8313  144   27]
 [  46    2    5    0   56 2869   23]
 [   3    2    5    0    1   24 2252]]
```

## Fall-related classes (RF)

- **f**: precision 0.98, recall 0.99, F1 0.99
- **af**: precision 0.95, recall 0.90, F1 0.93
- **nf**: precision 0.98, recall 0.96, F1 0.97

## Output artifacts (this run only)

- Numeric summary (this document)
- Confusion-matrix, feature-importance, and window-count bar chart (same folder)
- **random_forest_per_class_metrics.png** — precision/recall/F1 bar chart per class; run `python3 reports/new/plot_rf_per_class_metrics.py` after updating values in that script
- Trained model binaries under `ml/models/new/` (project root)
