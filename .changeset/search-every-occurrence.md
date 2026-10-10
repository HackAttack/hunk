---
"hunkdiff": minor
---

`n` / `N` now stop at every search match, including later matches in the same hunk or on the same line, in on-screen order: top to bottom in unified view and row by row, old side first, in split view. Extension API 32 adds `ctx.selection.layout`, the resolved `split` or `unified` layout; TypeScript authors constructing `ExtensionReviewSelection` must add the field. A new `/` search now starts at the cursor line instead of skipping the selected hunk.
