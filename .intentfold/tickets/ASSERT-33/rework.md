# ASSERT-33 rework

One round after the first delivery:

1. "那你不能显示not run，应该显示别的词，这个问题更严重" — Thens that never executed are named by
   why: "Not reached" after an earlier failure, a single "Before the checks" when the case stopped
   before any Then, and "Not reported" when the report omitted a step. The column is "Where it
   stopped", the card's not-run bucket reads "incomplete", and the case page says when a case
   stopped before its first check. Rechecked on the check page and case pages E2E-005, E2E-054 and
   E2E-117; typecheck, 39 tests, build and antd lint pass.
