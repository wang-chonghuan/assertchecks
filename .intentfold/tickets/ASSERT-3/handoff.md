# ASSERT-3 handoff

## What changed

In `finoge-app/nsdk-ops`, branch `ASSERT-3-actions-runner` (commit `5f354ec`):

- `infra/actions-runner/install.sh`: idempotent root installer for Google Chrome stable, xvfb and
  two copies of GitHub Actions runner v2.338.0 (SHA-256 verified) owned by `nsdk-runner`.
- `infra/actions-runner/register.sh`: reads a one-hour registration token on stdin, configures each
  copy for `finoge-app/nsdk` with label `assertchecks-nsdk`, installs GitHub's systemd service as
  `nsdk-runner` and starts it.
- `infra/actions-runner/README.md`: runbook (install, register, status, removal, workflow usage).
- `README.md` and `scripts/pr-monitor/README.md`: point to the runners and keep the isolation rule.

On `vm-nsdk-automation`: Chrome 155.0.8059.84, xvfb and the two runners installed; runners registered
as `vm-nsdk-automation-1/2` and enabled at boot. The PR monitor was not modified.

## AC results

1. **Runners online with the label — passed.** `vm-nsdk-automation-1` and `-2` are `online` with
   `self-hosted,Linux,X64,assertchecks-nsdk`.
2. **Headed Chrome as `nsdk-runner` — passed (grill wording).** The Chrome main process had no
   `--headless`, ran on `DISPLAY=:100` from `xvfb-run`, and DevTools reported "Example Domain".
3. **Isolation — passed.** Both `Runner.Listener` processes run as `nsdk-runner`; as that account,
   reading `/etc/nsdk-pr-monitor/*` and listing `/var/lib/nsdk-pr-monitor` are denied and `sudo`
   requires a password.
4. **Recovery after reboot — passed.** After waiting for the monitor service to be idle and running
   `systemctl reboot`, both runners returned `online`; the monitor timer is active.

nsdk-ops `npm test`: 31 passed. The runner scripts have no unit tests; their verification is the
live installation above.

## Deviations

- No per-job workspace hook: `actions/checkout` already cleans the repository workspace, so a
  custom recursive cleanup was unnecessary.
- AC 2's wording was changed in the grill as recorded.

## Environment

No ports or env keys. No credential stored on the VM beyond the runners' own registration files.

## Residual

- NSDK workflows using these runners must not run `playwright install --with-deps` (no sudo) and must
  run headed tests under `xvfb-run`; included in the NSDK instructions.
