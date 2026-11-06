# ASSERT-51 acceptance checks

1. **Inter everywhere, no Space Grotesk.** Browser on the ticket port, signed in as the sandbox account:
   homepage, login, projects list, `/p/sandbox` checks and errors tabs. `getComputedStyle` of body,
   headings, buttons, tags and the wordmark starts with Inter; `document.fonts` shows Inter loaded and
   no Space Grotesk face; the network list has no Space Grotesk request. True when all hold on every page.
2. **Served from our own origin.** Network requests for fonts on those pages all go to the local origin
   (`/fonts/inter/...`); no request to fonts.googleapis.com, fonts.gstatic.com or another font host.
3. **Not thinner.** Before/after screenshots of the same pages at 1440×900 and 390×844, compared side by
   side; plus the measured stem widths for the weights in use (plan.md). True when no text style is
   lighter after than before.
4. **Monospace unchanged.** On the errors tab, a stack or code block's computed font family equals the
   `fontFamilyCode` value before and after.
