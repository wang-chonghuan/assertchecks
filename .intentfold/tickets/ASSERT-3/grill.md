# ASSERT-3 grill

Mode: Grill: human. Saved before asking; answers below.

## Q1. How is the runner registered without a long-lived credential?

Recommendation: the agent requests a one-hour registration token through the owner's `gh`
(repository admin) and passes it to the VM over SSH stdin without printing it. The runner keeps its
registration on the VM disk, so no PAT or GitHub App is stored. Re-registration after a disk loss
repeats this step.

## Q2. Runner layout?

Recommendation: two persistent runner services as `nsdk-runner`, registered only to
`finoge-app/nsdk` with label `assertchecks-nsdk`, each job starting from a cleaned workspace; Node 24,
Google Chrome and xvfb preinstalled; installed by a script in `nsdk-ops` (`infra/actions-runner/`).

## Q3. How is the "workflow runs on the VM" criterion verified without touching NSDK?

Recommendation: verify the runners are online with the label, and that `nsdk-runner` can start
headed Chrome under xvfb and load a page on the VM. A real NSDK workflow run is verified by the
separate NSDK ticket that adds the workflow. This changes the wording of AC 2.

## Q4. Landing in nsdk-ops?

Recommendation: branch and PR in `finoge-app/nsdk-ops`, merged together with the other tickets at the
end; the PR notes that it is tracked by Plane ASSERT-3 rather than a Linear ticket.

## Answers

Answered by the owner on 2026-10-17:

- Q1: approved, with the instruction not to add work for the owner or the future and not to over-defend. GitHub registration tokens are fixed at one hour, so the runner is registered once by the agent; it then renews its own credentials on the VM and needs no long-lived token.
- Q2–Q4: accepted as recommended.
