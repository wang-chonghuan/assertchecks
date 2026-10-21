# ASSERT-34 rework

Rounds after the first delivery, each rechecked in the browser with typecheck, 39 tests, build and
antd lint passing:

1. "为啥切换页面这么慢？" — pages read only the catalog fields they show, the history counts from
   results without error text, the case page reads its one case and per-run result directly, and
   independent queries run in parallel. Locally against the remote database: project page 21.9 s to
   7.4 s, check page 28.1 s to 6.3 s, case page 20.0 s to 3.4 s, identical results.
2. "选中一次run后这个选中的这一行要高亮，然后点击行就要能选…" — a click anywhere on a history row
   opens its run; the run on screen is highlighted and its page opened; copying a SHA does not open
   the run. Same on the case page's per-run list.
3. "那个deployed 的api和web你是从哪弄到的，test commit又是啥？…" — question-mark tooltips on the Test
   commit and Deployed column titles explain each source.
4. "我想根据这个创建bug单子…" — "Copy for bug tickets" on the check page and "Copy for a bug ticket"
   on the case page copy a report a coding agent can file tickets from.
5. "我应该copy哪一版本的？19个的还是14个的？…" — the check page's "Copy bugs from recent runs" gathers
   every case that did not pass in the last 10 full runs, each with its full Given/When/Then, latest
   failure and links on the page's own origin; it is read only when the button is pressed.
6. "你有问题的全部放到单子里…复制说明你也要改…" — the copied instructions make every case end in a
   ticket, with open questions filed for their owner to investigate.
7. "你优化一下这个assc的技能，以后根据copy开bug单子，我会走新的cap…" — the copied report points the
   agent at the assertchecks skill's cap7 (ASSERT-35), with a short fallback.
