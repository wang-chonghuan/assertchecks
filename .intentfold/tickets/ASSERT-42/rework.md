# ASSERT-42 rework

Thirteen rounds after the frozen handoff, each its own commit with the ask as its first line.

1. 5424eaf — "这里是 2/160 failed 红色badge 0/160 failed 绿色badge 返工": the run history's result is one
   badge "failed/ran failed", red when any failed, green when none did. Rechecked on sandbox dev and prod
   (a one-case passing run #94 was reported to sandbox dev to show the green badge).
2. cca3a1b — "error列没必要显示，然后错误日志的锁紧不对…加一个复制的图标按钮": no Error column; errors
   render through one `ErrorLog` component with a copy icon (check page, case page, production stacks).
3. 00507b7 — "我意思是你要锁进到这个位置吧…不要再放卡片了": the expanded error starts under the case
   text (fixed expand/select column width, Ticket takes the spare width; measured 230 = 230 px); no box.
4. 911a024 — "打开case页，应该首先显示该case的内容…最后显示每次run的记录": case page order is the case
   (steps and fields, nothing folded), its Bug card, then results by run.
5. d7c69ed — "这两个复制图标重复了…given when then和红框里的要分开显示": one copy icon (the one-case
   report and its button removed); catalog fields as a quiet line under the steps table.
6. 2857a7b — "项目页面的bugs列表就不要显示了吧…": the project page shows only environment cards; the
   project-wide bug list, its server function and query removed.
7. 1b69aed — "hero区域的文案重新想…融合 tests, errors, assertations和checks": a fused headline (later
   replaced) and the two "Never…" lines removed.
8. 2474cdd — "Assertion monitoring for your products；副标题…然后是那3个bullets": the owner's headline,
   a subtitle and three points; tab title follows.
9. d19ea3f — "字太大，和图片也不协调…260个断言，31个报错…": display token 52/60, example card 31 failed
   of 260 cases tested.
10. 17553d5 — "我点logo怎么回不到首页了…slogan太大，太细…不要让图片上下出现太多空白": logo back to the
    homepage; display 44/52 at weight 500; hero padding one step smaller (hero 437 → 373 px).
11. c9ea6d3 — subtitle "Be the first to know about production errors and end-to-end failures."
12. ba5fa3f — subtitle "Be the first to know about test failures and errors in production."
13. 305d93e — point "Production errors distilled into real problems."

Each round reran the affected pages at 1440×900 and 390×844 and the mechanical defence (typecheck,
tests, check:infui, build). Net effect against the handoff: AC 1–19 hold except AC 4's "brand opens the
projects", which round 10 reverted at the owner's ask (the brand opens the homepage; there is still no
Home button).
