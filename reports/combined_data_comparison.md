# Combined Data Training Comparison

Generated: 2026-03-13 15:31:25.370882

## Dataset Summary

| Dataset | Samples | Windows |
|---------|---------|--------|
| Original (your data) | 292,664 | 11,577 |
| Friend's data | 804,719 | 32,056 |
| Combined | 1,097,383 | 43,633 |

## Label Distribution

### Original Data
- af: 58,967
- f: 4,541
- nf: 11,876
- r: 7,888
- si: 55,135
- st: 119,673
- w: 34,584

### Friend's Data
- nf: 38,921
- si: 565,396
- st: 123,739
- w: 76,663

## Accuracy Comparison

| Model | Accuracy |
|-------|----------|
| Original data only | 89.25% |
| Combined data | 95.90% |
| **Difference** | **+6.65%** |

## Verdict

IMPROVED - Adding friend's data helped!

## Notes

Friend's data is missing these labels: ['af', 'f', 'r']
This means critical labels like falling (f) and after-fall (af) are only from your data.
