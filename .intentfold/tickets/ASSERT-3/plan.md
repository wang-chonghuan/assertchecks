# ASSERT-3 plan

## What the code and server say that the ticket does not

- `vm-nsdk-automation` already has Node 24 and the reserved `nsdk-runner` account (home
  `/var/lib/nsdk-runner`, no sudo). The PR monitor's credentials (`/etc/nsdk-pr-monitor`, 0700 root)
  and home (`/var/lib/nsdk-pr-monitor`, 0700 nsdk-pr) are already unreadable to it.
- nsdk-ops deploys the PR monitor from `/opt/nsdk-ops`; replacing that checkout requires stopping the
  monitor. The runner scripts are self-contained, so they run from a copy of the committed revision
  without touching the monitor.
- GitHub registration tokens last one hour and cannot be longer; a registered runner renews its own
  credentials, so one registration is enough.
- The account has no sudo, so NSDK jobs cannot run `playwright install --with-deps`; Chrome must be
  preinstalled.

## Route

1. nsdk-ops `infra/actions-runner/install.sh` (root, idempotent): Google Chrome stable from Google's
   apt repository, xvfb, runner v2.338.0 verified by SHA-256, two copies owned by `nsdk-runner`,
   runner OS dependencies.
2. `register.sh` (root): token on stdin; configure each copy for `finoge-app/nsdk` with label
   `assertchecks-nsdk`; install and start GitHub's systemd service as `nsdk-runner`.
3. Runbook `infra/actions-runner/README.md`; nsdk-ops README and PR-monitor runbook updated.
4. Install and register on the VM; verify, including a reboot.

Cross-repository: code in `finoge-app/nsdk-ops` branch `ASSERT-3-actions-runner`; IntentFold
records stay here.
