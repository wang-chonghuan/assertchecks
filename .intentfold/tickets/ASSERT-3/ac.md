# ASSERT-3 acceptance checks

1. Runners listed for finoge-app/nsdk, online, labelled `assertchecks-nsdk`:
   `gh api repos/finoge-app/nsdk/actions/runners`.
2. (Wording changed in the grill) `nsdk-runner` starts headed Chrome under xvfb on the VM and loads a
   page: the Chrome main process has no `--headless`, has a `DISPLAY`, and the DevTools endpoint
   reports the page title. A real NSDK workflow run is verified by the NSDK ticket that adds it.
3. Runner processes run as `nsdk-runner`, which cannot read the PR monitor's credentials or home and
   has no sudo: `ps -C Runner.Listener` and access attempts as `nsdk-runner`.
4. After `systemctl reboot`, both runners return online without intervention.
