# IMU Fall/Activity Detection - Combined Data Results

Generated: 2026-03-13 15:42:30

**Dataset**: Combined (original + friend's data)

## Label Reference

| Abbrev | Full Name | Description |
|--------|-----------|-------------|
| **af** | after fall | On floor after fall (needs help) |
| **f** | falling | Active fall in progress |
| **nf** | near fall | Unstable standing (early warning) |
| **r** | running | Running/jogging |
| **si** | sitting | Seated position |
| **st** | standing | Normal standing position |
| **w** | walking | Walking/moving |

## Dataset Summary

### Data Sources

| Source | Sessions | Samples | Windows |
|--------|----------|---------|--------|
| Original (your data) | 70 | 292,664 | - |
| Friend's data | 88 | 804,719 | - |
| **Combined** | **158** | **1,097,383** | **43,633** |

### Configuration

| Metric | Value |
|--------|-------|
| Total sessions | 158 |
| Total samples | 1,097,383 |
| Total windows | 43,633 |
| Window size | 1.0 second |
| Window step | 0.5 second (50% overlap) |
| Features | 32 (mean, std, min, max for ax, ay, az, a_mag, gx, gy, gz, w_mag) |
| Train/Test split | 70% / 30% by session |

### Window Distribution by Label

| Label | Train | Test | Total |
|-------|-------|------|-------|
| af (after fall) | 1,525 | 827 | 2,352 |
| f (falling) | 127 | 55 | 182 |
| nf (near fall) | 1,414 | 614 | 2,028 |
| r (running) | 236 | 79 | 315 |
| si (sitting) | 17,017 | 7,648 | 24,665 |
| st (standing) | 6,897 | 2,750 | 9,647 |
| w (walking) | 3,222 | 1,222 | 4,444 |

## Dataset Split

- **Train sessions** (110): [np.int64(1), np.int64(2), np.int64(3), np.int64(4), np.int64(5), np.int64(6), np.int64(7), np.int64(8), np.int64(9), np.int64(11), np.int64(12), np.int64(14), np.int64(15), np.int64(17), np.int64(18), np.int64(21), np.int64(22), np.int64(24), np.int64(26), np.int64(28)]...
- **Test sessions** (48): [np.int64(10), np.int64(13), np.int64(16), np.int64(19), np.int64(20), np.int64(23), np.int64(25), np.int64(27), np.int64(30), np.int64(31), np.int64(32), np.int64(37), np.int64(43), np.int64(46), np.int64(52), np.int64(56), np.int64(57), np.int64(66), np.int64(68), np.int64(70)]...

## Model Comparison Summary

| Model | Accuracy | Macro F1 | Weighted F1 |
|-------|----------|----------|-------------|
| Logistic Regression | 81.30% | 0.78 | 0.80 |
| **Random Forest** | **95.28%** | **0.92** | **0.95** |

## Logistic Regression

**Overall Accuracy:** 0.8130 (81.30%)

### Classification Report

```
              precision    recall  f1-score   support

          af       0.81      0.59      0.68       827
           f       0.78      0.73      0.75        55
          nf       0.86      0.77      0.81       614
           r       0.91      0.94      0.93        79
          si       0.82      0.97      0.89      7648
          st       0.69      0.43      0.53      2750
           w       0.91      0.88      0.90      1222

    accuracy                           0.81     13195
   macro avg       0.83      0.76      0.78     13195
weighted avg       0.80      0.81      0.80     13195
```

### Confusion Matrix

Labels: ['af', 'f', 'nf', 'r', 'si', 'st', 'w']

```
[[ 487    4   22    0  150  143   21]
 [   2   40    7    1    0    2    3]
 [   6    3  472    5    3  110   15]
 [   0    0    4   74    0    0    1]
 [  23    0    8    0 7402  173   42]
 [  63    4   27    0 1459 1176   21]
 [  17    0   11    1   26   90 1077]]
```

## Random Forest

**Overall Accuracy:** 0.9528 (95.28%)

### Classification Report

```
              precision    recall  f1-score   support

          af       0.91      0.85      0.88       827
           f       0.75      0.85      0.80        55
          nf       0.91      0.93      0.92       614
           r       0.97      0.99      0.98        79
          si       0.98      0.97      0.98      7648
          st       0.90      0.93      0.92      2750
           w       0.96      0.97      0.96      1222

    accuracy                           0.95     13195
   macro avg       0.91      0.93      0.92     13195
weighted avg       0.95      0.95      0.95     13195
```

### Confusion Matrix

Labels: ['af', 'f', 'nf', 'r', 'si', 'st', 'w']

```
[[ 703    9    3    0   30   79    3]
 [   3   47    3    0    0    2    0]
 [   3    2  568    2   18    8   13]
 [   0    0    1   78    0    0    0]
 [  21    0   29    0 7428  149   21]
 [  39    4   14    0  109 2567   17]
 [   1    1    3    0    0   36 1181]]
```

## Key Findings

### Best Performing Classes (Random Forest F1)
1. **r (running)**: 0.98
1. **si (sitting)**: 0.98
1. **w (walking)**: 0.96
1. **nf (near fall)**: 0.92

### Most Challenging Classes
1. **af (after fall)**: 0.88
1. **f (falling)**: 0.80

### Fall Detection Performance
- **Falling (f)**: Precision 75%, Recall 85%, F1 0.80
- **After Fall (af)**: Precision 91%, Recall 85%, F1 0.88
- **Near Fall (nf)**: Precision 91%, Recall 93%, F1 0.92

### Activity Detection Performance
- **Running (r)**: Precision 98%, Recall 99%, F1 0.98 ⭐ (best)
- **Walking (w)**: Precision 96%, Recall 97%, F1 0.96
- **Standing (st)**: Precision 90%, Recall 93%, F1 0.92
- **Sitting (si)**: Precision 98%, Recall 97%, F1 0.98

## Generated Files

- `baseline_results.md` - This report
- `random_forest_confusion_matrix.png` - RF confusion matrix visualization
- `logistic_regression_confusion_matrix.png` - LR confusion matrix visualization
- `feature_importance.png` - Top features from Random Forest
