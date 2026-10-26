# ASSERT-42 acceptance checks

Port 63042, signed in as the sandbox account, 1440×900 and 390×844; homepage signed out where it matters.

1. Case page of a failed sandbox case (E2E-094): the error text is visible without clicking.
2. Sandbox Production errors: no row shows two buttons; the row menu attaches a ticket dialog and offers
   Not handling (dialog opened and cancelled; no write).
3. Check page: no "Run details"; test commit and deployed versions appear once (history).
4. Signed in: no Home button; the brand opens /p (redirects to the last project).
5. Bugs list, check page ticket column and case page show the same short label ("Plane ticket" for the
   sandbox Plane link); hovering shows the full URL; clicking opens it.
6. A case that stopped before its first Then shows "Stopped before A1" (or its first Then id).
7. The outside tab reads "Not in regular runs (N)".
8. Errors page top: three separate labelled figures.
9. Each group title's count equals the rows in it.
10. One time-folded group.
11. No "Appeared together" text on the errors page.
12. Errors groups and headline use Needs a ticket / In progress / Not handling.
13. Check page shows the check name once; project page shows the project name once.
14. No "Failing"/"Up" tag next to the numbers; history shows outcome tags only for incomplete/running/timed
    out.
15. The check page's failed table shows one header.
16. Case page has no status sentence (tooltip instead); errors page has no counting sentence (tooltip).
17. Homepage: the three questions appear once; "Copy for your agent" appears once.
18. Homepage has no "No SDK.".
19. Homepage names bugs with tickets and production errors.
Mechanical defence including check:infui passes.
