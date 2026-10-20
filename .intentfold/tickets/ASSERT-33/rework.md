# ASSERT-33 rework

Three rounds after the first delivery, each rechecked in the browser with typecheck, 39 tests,
build and antd lint passing:

1. "那你不能显示not run，应该显示别的词，这个问题更严重" — Thens that never executed are named by
   why: "Not reached" after an earlier failure, one "Before the checks" when the case stopped before
   any Then, "Not reported" when the report omitted a step. The column is "Where it stopped", the
   card's not-run bucket reads "incomplete", and the case page says when a case stopped before its
   first check.
2. "160 run这个run感觉不太对，人们想知道的是跑了多少case，其中几个报错/bug" — the card headline counts
   cases: "19 failed of 160 cases tested", or "160 cases passed" when nothing failed.
3. "项目下的环境，卡片本身可点击，你当前只让nsdk几个字可点击" — the whole environment card on the
   project page opens its check; the title stays a keyboard link and the run-info popover does not
   navigate.
