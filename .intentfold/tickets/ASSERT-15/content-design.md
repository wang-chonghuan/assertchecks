# Content Design: AssertChecks homepage

Made with ips-content-design: cap2 review of the live page, then cap1 for the structure and cap3 for
the words. Baseline (production, 2026-10-19): 4 sections below the hero, 8 visible code blocks,
834 words of body copy, 4,632 px tall at 1440×900.

## Job story

When my team's end-to-end tests need watching, I want to see what AssertChecks will tell me and hand
my coding agent the steps to connect our project, so I can see on one page whether every assertion
still holds.

Evidence: the owner's own requests in this project. AssertChecks only receives and judges results
("我只作为监控assert定期运行的平台…用户按照我的要求运行完，把结果上报"). The homepage should give an
immediate sense of the product ("让我先有直觉"). Connection should be handed to an agent ("copy 给你的
agent，就是copy接入方法"). Readers are engineers on the organization's projects (NSDK, BF) and their
agents. Reader behaviour is an assumption; confirm it with the first project that connects from the
homepage (BF), by watching which part it uses.

## The question this page answers

What will AssertChecks tell me about my project's end-to-end tests? The way to start (copy for the
agent, or sign in) is an action on the first screen, not a second question.

## Priority guide

| # | Element | Why it is here | Form | Facts from |
|---|---|---|---|---|
| 1 | Headline and one sentence | Answers the question | H1 + one sentence | Product charter |
| 2 | Copy for your agent; Sign in / Open my projects | The two ways to start | Buttons | — |
| 3 | Example environment card | Shows the result the reader will get | Rendered example (real component) | Fixed sample, labelled Example |
| 4 | Two trust facts | Decides whether a project may connect: no code run, no credentials held | Two short labels | Product charter redline |
| 5 | What a check judges: on time, complete, correct | The rules behind every status the reader will see | Three label + one-sentence items | `judge.ts`, `status.ts` |
| 6 | Connection steps | What the agent or engineer does | Five numbered steps, one or two sentences each, with code | Client, admin CLI, schemas |
| 7 | Report format reference | Needed only by producers that are not test runners, or when a report fails | Collapsed by default | Schemas, push API |

## Cut or moved

| Element | Moved to, or cut | Why |
|---|---|---|
| Hero label "End-to-end assertion monitoring" | Cut | Repeats the headline |
| "How to connect" button | Replaced by "Copy for your agent" | The copy is the action; the steps are one scroll away |
| "Push only" trust label | Cut | Internal vocabulary; the other two labels say what it means |
| healthchecks.io comparison sentence | Cut | Assumes the reader knows that product |
| Three large judgement cards (about 40 words each) | Shortened to one sentence each | The detail lives on the environment page |
| "How one run flows" five-step diagram | Cut | Repeats the connection steps |
| "What it checks" header link | Kept, pointing at the short section | Still a destination |
| Partial-run and no-results commands | Moved into the reference | Edge cases; still in the agent copy |
| Report format cards, cases format and pass rule | Collapsed into "Report format reference" | Reference material for a minority of readers |
| "What it does not do" section | Cut | "Show history yet" and "Send alerts yet" report absence; the two real boundaries are the trust facts |
| Teaching sentences above the copy callout | One line | They described the button instead of the content |

## How to test it

- First-screen test at 1440×900: the headline, the sentence and both start actions are visible
  without scrolling.
- Deletion test on every remaining element against the job story (above).
- Measure body words, visible code blocks and page height against the baseline.
- The agent copy keeps every step, code sample, format link and call; this is enforced by
  `tests/connect-guide.test.ts`.
- Real readers: watch BF's first connection from the homepage.
