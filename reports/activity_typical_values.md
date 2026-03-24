# Activity differentiation — typical values (combined dataset)

Generated: 2026-03-23 13:03:52

This report summarizes **typical IMU statistics** for each activity label using the same preprocessing as the Random Forest model: **1.0 s** windows, **0.5 s** step, majority label per window, and **32** window-level features (mean, std, min, max for `ax`–`az`, `a_mag`, `gx`–`gz`, `w_mag`).

## Label reference

| Code | Name | Description |
|------|------|-------------|
| **af** | after fall | On floor after fall (needs help) |
| **f** | falling | Active fall in progress |
| **nf** | near fall | Unstable standing (early warning) |
| **r** | running | Running/jogging |
| **si** | sitting | Seated position |
| **st** | standing | Normal standing position |
| **w** | walking | Walking/moving |

## Dataset scope

- **Samples (rows):** 1,097,383
- **Sessions:** 158
- **Windows:** 43,633

**Source mix:** The combined dataset merges your `session_*.csv` recordings with the friend’s `movement_*.csv` files. The friend’s files only contain labels **si**, **st**, **w**, and **nf**; windows for **af**, **f**, and **r** therefore come from your original sessions. Interpret rare-class typical values with the smaller **n_windows** for **f** and **r** in mind.

### Windows per label

| Label | Windows |
|-------|--------:|
| af | 2352 |
| f | 182 |
| nf | 2028 |
| r | 315 |
| si | 24665 |
| st | 9647 |
| w | 4444 |

## 1. Raw per-sample magnitudes (entire trace)

Each row is one IMU sample. **a_mag** = $\sqrt{a_x^2+a_y^2+a_z^2}$ (m/s²), **w_mag** = $\sqrt{g_x^2+g_y^2+g_z^2}$ (rad/s). Values are **mean ± std** across all samples with that label.

| label | n_samples | a_mag | w_mag |
| --- | --- | --- | --- |
| af | 58967 | 9.956 ± 0.623 | 0.246 ± 0.274 |
| f | 4541 | 10.697 ± 5.864 | 1.327 ± 0.980 |
| nf | 50797 | 9.878 ± 1.615 | 0.332 ± 0.370 |
| r | 7888 | 10.621 ± 6.597 | 0.994 ± 0.587 |
| si | 620531 | 9.802 ± 0.092 | 0.030 ± 0.055 |
| st | 243412 | 9.787 ± 0.423 | 0.204 ± 0.302 |
| w | 111247 | 10.390 ± 0.819 | 0.676 ± 0.339 |

## 2. Typical window-level features (what the classifier sees)

For each window, features are computed from all samples inside the window. Below, **typical value** = **mean across windows** of that feature; the **±** term is the **standard deviation across windows** (how much windows vary), not the std inside a single window.

### Highlighted features

| Label | n_windows | w_mag_mean | w_mag_max | gy_std | w_mag_std | a_mag_max | a_mag_mean | az_std | a_mag_std |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| af | 2352 | 0.251 ± 0.238 | 0.533 ± 0.607 | 0.133 ± 0.156 | 0.112 ± 0.140 | 11.098 ± 2.727 | 9.971 ± 0.327 | 0.450 ± 0.495 | 0.410 ± 0.628 |
| f | 182 | 1.177 ± 0.492 | 3.584 ± 1.538 | 0.817 ± 0.385 | 0.798 ± 0.325 | 30.501 ± 13.102 | 10.599 ± 1.089 | 2.966 ± 1.318 | 4.820 ± 2.246 |
| nf | 2028 | 0.323 ± 0.289 | 0.677 ± 0.805 | 0.212 ± 0.213 | 0.143 ± 0.179 | 12.197 ± 4.758 | 9.879 ± 0.243 | 0.513 ± 0.738 | 0.793 ± 1.364 |
| r | 315 | 0.991 ± 0.382 | 1.985 ± 0.717 | 0.653 ± 0.169 | 0.427 ± 0.165 | 22.746 ± 3.230 | 10.623 ± 0.820 | 2.461 ± 0.543 | 6.481 ± 1.381 |
| si | 24665 | 0.033 ± 0.056 | 0.061 ± 0.124 | 0.019 ± 0.035 | 0.014 ± 0.038 | 9.946 ± 0.253 | 9.806 ± 0.047 | 0.083 ± 0.133 | 0.073 ± 0.075 |
| st | 9647 | 0.207 ± 0.272 | 0.391 ± 0.494 | 0.115 ± 0.158 | 0.087 ± 0.116 | 10.345 ± 1.366 | 9.787 ± 0.115 | 0.292 ± 0.383 | 0.246 ± 0.374 |
| w | 4444 | 0.658 ± 0.280 | 0.963 ± 0.530 | 0.409 ± 0.113 | 0.156 ± 0.162 | 11.912 ± 1.268 | 10.364 ± 0.366 | 0.578 ± 0.270 | 0.649 ± 0.394 |

### All 32 features (mean ± std across windows)

| Feature | af | f | nf | r | si | st | w |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ax_mean | 1.614 ± 2.441 | 1.502 ± 2.050 | 0.018 ± 0.376 | 0.185 ± 0.363 | 0.008 ± 0.280 | 0.161 ± 0.583 | 0.096 ± 0.434 |
| ax_std | 0.495 ± 0.535 | 3.109 ± 1.541 | 0.674 ± 0.705 | 1.838 ± 0.473 | 0.110 ± 0.107 | 0.301 ± 0.301 | 1.027 ± 0.192 |
| ax_min | 0.546 ± 2.712 | -5.071 ± 3.746 | -1.427 ± 2.009 | -4.275 ± 1.747 | -0.189 ± 0.349 | -0.425 ± 0.782 | -1.751 ± 0.663 |
| ax_max | 2.771 ± 3.001 | 11.334 ± 7.668 | 1.508 ± 2.154 | 4.138 ± 1.366 | 0.207 ± 0.360 | 0.760 ± 0.944 | 1.904 ± 0.661 |
| ay_mean | 7.680 ± 1.703 | 8.748 ± 1.084 | 2.275 ± 4.094 | 9.739 ± 0.813 | 0.810 ± 2.624 | 4.675 ± 4.790 | 3.009 ± 4.470 |
| ay_std | 0.460 ± 0.622 | 4.604 ± 2.094 | 0.921 ± 1.314 | 6.995 ± 1.566 | 0.101 ± 0.075 | 0.273 ± 0.367 | 0.719 ± 0.354 |
| ay_min | 6.700 ± 1.855 | 1.037 ± 3.888 | 0.548 ± 2.563 | -0.905 ± 1.876 | 0.628 ± 2.543 | 4.128 ± 4.791 | 1.597 ± 3.922 |
| ay_max | 8.865 ± 3.207 | 27.373 ± 11.917 | 4.731 ± 7.950 | 22.442 ± 3.214 | 0.996 ± 2.726 | 5.269 ± 5.054 | 4.671 ± 5.536 |
| az_mean | 0.151 ± 5.298 | -0.075 ± 3.156 | 7.561 ± 4.077 | 0.743 ± 0.487 | 9.188 ± 2.019 | 5.174 ± 4.844 | 7.573 ± 4.410 |
| az_std | 0.450 ± 0.495 | 2.966 ± 1.318 | 0.513 ± 0.738 | 2.461 ± 0.543 | 0.083 ± 0.133 | 0.292 ± 0.383 | 0.578 ± 0.270 |
| az_min | -0.798 ± 5.492 | -9.980 ± 7.701 | 6.377 ± 5.837 | -5.299 ± 1.804 | 9.044 ± 2.163 | 4.624 ± 5.047 | 6.293 ± 4.969 |
| az_max | 1.065 ± 5.334 | 5.920 ± 4.234 | 8.711 ± 2.888 | 4.927 ± 1.340 | 9.335 ± 1.898 | 5.725 ± 4.732 | 8.628 ± 4.033 |
| a_mag_mean | 9.971 ± 0.327 | 10.599 ± 1.089 | 9.879 ± 0.243 | 10.623 ± 0.820 | 9.806 ± 0.047 | 9.787 ± 0.115 | 10.364 ± 0.366 |
| a_mag_std | 0.410 ± 0.628 | 4.820 ± 2.246 | 0.793 ± 1.364 | 6.481 ± 1.381 | 0.073 ± 0.075 | 0.246 ± 0.374 | 0.649 ± 0.394 |
| a_mag_min | 9.117 ± 0.999 | 4.398 ± 1.723 | 8.519 ± 2.109 | 1.447 ± 1.063 | 9.676 ± 0.133 | 9.296 ± 0.685 | 8.974 ± 1.203 |
| a_mag_max | 11.098 ± 2.727 | 30.501 ± 13.102 | 12.197 ± 4.758 | 22.746 ± 3.230 | 9.946 ± 0.253 | 10.345 ± 1.366 | 11.912 ± 1.268 |
| gx_mean | -0.013 ± 0.144 | 0.103 ± 0.397 | 0.005 ± 0.080 | -0.055 ± 0.078 | 0.001 ± 0.032 | -0.007 ± 0.099 | 0.006 ± 0.081 |
| gx_std | 0.105 ± 0.112 | 0.660 ± 0.300 | 0.177 ± 0.149 | 0.432 ± 0.101 | 0.019 ± 0.037 | 0.089 ± 0.132 | 0.331 ± 0.131 |
| gx_min | -0.226 ± 0.283 | -1.240 ± 0.742 | -0.338 ± 0.342 | -1.005 ± 0.278 | -0.035 ± 0.090 | -0.177 ± 0.283 | -0.552 ± 0.177 |
| gx_max | 0.215 ± 0.351 | 1.912 ± 1.285 | 0.375 ± 0.445 | 0.909 ± 0.382 | 0.036 ± 0.077 | 0.162 ± 0.246 | 0.556 ± 0.202 |
| gy_mean | -0.018 ± 0.199 | 0.040 ± 0.718 | -0.026 ± 0.235 | -0.058 ± 0.735 | 0.001 ± 0.019 | 0.015 ± 0.200 | -0.026 ± 0.477 |
| gy_std | 0.133 ± 0.156 | 0.817 ± 0.385 | 0.212 ± 0.213 | 0.653 ± 0.169 | 0.019 ± 0.035 | 0.115 ± 0.158 | 0.409 ± 0.113 |
| gy_min | -0.292 ± 0.438 | -2.137 ± 1.700 | -0.465 ± 0.689 | -1.309 ± 0.911 | -0.034 ± 0.074 | -0.197 ± 0.338 | -0.713 ± 0.530 |
| gy_max | 0.255 ± 0.381 | 1.734 ± 1.325 | 0.373 ± 0.458 | 1.256 ± 0.774 | 0.036 ± 0.077 | 0.224 ± 0.355 | 0.654 ± 0.499 |
| gz_mean | -0.044 ± 0.101 | 0.134 ± 0.261 | -0.012 ± 0.055 | -0.047 ± 0.087 | -0.002 ± 0.023 | -0.017 ± 0.057 | -0.015 ± 0.067 |
| gz_std | 0.080 ± 0.087 | 0.482 ± 0.213 | 0.155 ± 0.095 | 0.360 ± 0.076 | 0.016 ± 0.020 | 0.077 ± 0.126 | 0.137 ± 0.051 |
| gz_min | -0.210 ± 0.248 | -0.994 ± 0.781 | -0.308 ± 0.263 | -0.809 ± 0.238 | -0.032 ± 0.053 | -0.162 ± 0.232 | -0.265 ± 0.152 |
| gz_max | 0.122 ± 0.217 | 1.322 ± 0.629 | 0.288 ± 0.238 | 0.682 ± 0.232 | 0.027 ± 0.043 | 0.128 ± 0.236 | 0.243 ± 0.138 |
| w_mag_mean | 0.251 ± 0.238 | 1.177 ± 0.492 | 0.323 ± 0.289 | 0.991 ± 0.382 | 0.033 ± 0.056 | 0.207 ± 0.272 | 0.658 ± 0.280 |
| w_mag_std | 0.112 ± 0.140 | 0.798 ± 0.325 | 0.143 ± 0.179 | 0.427 ± 0.165 | 0.014 ± 0.038 | 0.087 ± 0.116 | 0.156 ± 0.162 |
| w_mag_min | 0.080 ± 0.091 | 0.200 ± 0.179 | 0.085 ± 0.083 | 0.241 ± 0.184 | 0.009 ± 0.017 | 0.062 ± 0.103 | 0.400 ± 0.209 |
| w_mag_max | 0.533 ± 0.607 | 3.584 ± 1.538 | 0.677 ± 0.805 | 1.985 ± 0.717 | 0.061 ± 0.124 | 0.391 ± 0.494 | 0.963 ± 0.530 |

## 3. How to read this for the thesis

- **Seated vs standing:** **Sitting** (**si**) windows are very stable in this dataset (mean `w_mag_mean` ≈ **0.03** rad/s, mean `a_mag_std` ≈ **0.07** m/s² across windows), whereas **standing** (**st**) shows higher rotation and acceleration variability (`w_mag_mean` ≈ **0.21**, `a_mag_std` ≈ **0.25**), which helps separate posture despite similar net acceleration near 1 g.
- **Walking vs running:** **Walking** reaches lower peak acceleration in typical windows than **running** (mean `a_mag_max` ≈ **11.9** vs **22.7** m/s²; mean `a_mag_std` ≈ **0.65** vs **6.48** m/s²), matching stronger periodic impacts and torso motion while jogging.
- **Near fall** (**nf**): mean `w_mag_mean` ≈ **0.32** rad/s and `a_mag_std` ≈ **0.79** m/s² sit between calm standing and walking in this corpus—consistent with sway and balance corrections.
- **Falling** (**f**) vs **after fall** (**af**): **falling** windows show the highest typical peaks (`a_mag_max` mean ≈ **30.5** m/s² vs **11.1** for **af**), while **af** is closer to quiet standing in mean magnitude but still more heterogeneous across windows than **sitting**, aligning with lying on the floor and recovery motion.
- The **Random Forest** combines all 32 dimensions; use `reports/feature_importance.png` with this table to justify which statistics drive separation.

---

**Regenerate:** from the repository root, run `python ml/report_activity_typical_values.py` (requires dependencies in `ml/requirements.txt`).
