# ASSERT-55 grill

Grill: human. The two defining decisions (login + email-domain group; project-level; domain group
read-only) were settled with the owner before filing. Remaining questions were below the bar and are
decided here from the charter, the code and the owner's stated goal.

1. Do domain-group projects appear in the project switcher, or only via deep link? — Appear in the
   switcher and `/p` list. They are authorised to view the project, so hiding it would only confuse.
2. Domain match exact or subdomains? — Exact, lowercased. Subdomain wildcards add attack surface and
   were not asked for.
3. Does the CLI client (client tokens) also honour domain groups? — No. The client links tickets, which
   is editing; domain groups are web-view only. Keeps the CLI member-only.
4. A new redline for adding a domain to a real project? — Yes. Added to operations.md: adding an allowed
   domain to a real project (nsdk/bf/customer) needs the owner's approval, because it exposes that
   project's production errors and runs to everyone at the domain. Consistent with redline 10's caution.
