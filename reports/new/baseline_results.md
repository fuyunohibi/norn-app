# IMU Fall/Activity Detection — Training results

Generated: 2026-03-24 17:50:35

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
| Sessions | 658 |
| Samples | 2,597,956 |
| Total windows | 102,913 |
| Window size | 1.0 s |
| Window step | 0.5 s (50% overlap) |
| Features | 32 |
| Train / test split | 70% / 30% by session |

### Window distribution by label (all windows)

| Label | Windows |
|-------|--------:|
| af | 14,096 |
| f | 12,131 |
| nf | 13,846 |
| r | 12,204 |
| si | 24,665 |
| st | 9,647 |
| w | 16,324 |

## Session split

- Train sessions (460)
- Test sessions (198)

## Model comparison

| Model | Accuracy | Macro F1 | Weighted F1 |
|-------|----------|----------|-------------|
| Logistic regression | 90.19% | 0.89 | 0.90 |
| **Random forest** | **97.68%** | **0.98** | **0.98** |

## Logistic regression

**Overall accuracy:** 0.9019 (90.19%)

### Classification report

```
              precision    recall  f1-score   support

          af       0.97      0.91      0.94      4725
           f       0.99      0.99      0.99      3416
          nf       0.96      0.86      0.91      3668
           r       1.00      1.00      1.00      3415
          si       0.82      0.97      0.89      8805
          st       0.67      0.50      0.57      3447
           w       0.96      0.95      0.95      5108

    accuracy                           0.90     32584
   macro avg       0.91      0.88      0.89     32584
weighted avg       0.90      0.90      0.90     32584

```

### Confusion matrix

Labels: ['af', 'f', 'nf', 'r', 'si', 'st', 'w']

```
[[4320    9    7    0  191  147   51]
 [   5 3394   13    0    0    2    2]
 [  17   12 3162    7   32  403   35]
 [   0    1    7 3401    0    2    4]
 [  33    0   14    0 8548  155   55]
 [  61    3   65    0 1556 1724   38]
 [  24    1   35    8   55  148 4837]]
```

## Random forest

**Overall accuracy:** 0.9768 (97.68%)

### Classification report

```
              precision    recall  f1-score   support

          af       0.98      0.97      0.98      4725
           f       0.99      1.00      0.99      3416
          nf       0.99      0.98      0.98      3668
           r       1.00      1.00      1.00      3415
          si       0.98      0.97      0.98      8805
          st       0.92      0.93      0.93      3447
           w       0.98      0.99      0.98      5108

    accuracy                           0.98     32584
   macro avg       0.98      0.98      0.98     32584
weighted avg       0.98      0.98      0.98     32584

```

### Confusion matrix

Labels: ['af', 'f', 'nf', 'r', 'si', 'st', 'w']

```
[[4586   12    4    0   21   85   17]
 [   5 3405    2    1    1    1    1]
 [   6   15 3580    8   19   14   26]
 [   0    5    6 3400    0    2    2]
 [  43    0   23    0 8580  131   28]
 [  33    6    9    0  134 3222   43]
 [   0    2    5    0    1   44 5056]]
```

## Fall-related classes (RF)

- **f**: precision 0.99, recall 1.00, F1 0.99
- **af**: precision 0.98, recall 0.97, F1 0.98
- **nf**: precision 0.99, recall 0.98, F1 0.98

## Output artifacts (this run only)

- Numeric summary (this document)
- Confusion-matrix, feature-importance, and window-count bar chart (same folder)
- Trained model binaries under `ml/models/new/` (project root)
