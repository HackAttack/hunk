---
"hunkdiff": minor
---

Add a `scroll_off` setting (and `--scroll-off <rows>` flag) that defaults to keeping five rows of context around the current line while stepping through a diff, like Vim's `scrolloff`, with `scroll_off = 0` or `--scroll-off 0` restoring edge-only scrolling.
