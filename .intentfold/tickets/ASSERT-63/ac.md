# ASSERT-63 acceptance checks

1. **PROD card hidden on NSDK overview.** Open https://assertchecks.com/p/nsdk → Tests tab. The grid
   shows DEV, Local and prod-live; there is no PROD card.
2. **PROD data preserved and reachable.** The PROD check detail page is still reachable by direct link
   (`/p/nsdk/checks/prod`) and still shows its runs.
3. **Reversible.** `pnpm admin check:show nsdk prod` makes the PROD card appear again;
   `pnpm admin check:hide nsdk prod` hides it. `pnpm admin list` shows the `hidden` column.
4. **Other projects unaffected.** BF and any other project still show all their checks.
5. **Mechanical defence green:** `pnpm typecheck && pnpm test && pnpm check:infui && pnpm build`.
