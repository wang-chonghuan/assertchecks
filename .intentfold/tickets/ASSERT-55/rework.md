# ASSERT-55 rework

Changes after the frozen handoff (`handoff.md` unchanged).

## Round 1 — a share icon on each run-history row

Ask (owner): "run 的旁边没个分享图标按钮吗，一键复制专属 url？还是我从浏览器地址栏去复制？"

Changed: added a share icon button to each row of the run-history table on the check page
(`src/routes/_app/p/$project/checks/$check/index.tsx`). It copies that run's own pinned link
(`?run=<id>`) and calls `stopPropagation`, so clicking the icon copies without opening the run. The
header "Copy link" button (which copies the run currently viewed) stays.

Rechecked: AC5. The icon is present on every finished run row (desktop and phone); hovering shows
"Copy a link to this run"; clicking it does not navigate (the row's run does not open) and
`navigator.clipboard.writeText` succeeds in the secure context. Mechanical defence rerun: typecheck,
80 tests, check:infui, build all pass. No other criterion was affected.

Net effect vs handoff: the same per-run link the handoff described is now one click from the run list,
not only from the header of an opened run.
