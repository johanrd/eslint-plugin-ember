# autoplay probes

Throwaway empirical verifications for `template-no-autoplay`. Referenced by the
PR that introduces that rule.

## idl-reflection.jsdom.js

Parses a small battery of `<audio autoplay="...">` shapes in jsdom, then prints
`hasAttribute('autoplay')`, `getAttribute('autoplay')`, and the
`HTMLMediaElement.autoplay` IDL reflection.

    node probes/autoplay/idl-reflection.jsdom.js

## idl-reflection.browser.html

Same cases, self-contained page. Open in any browser, read the table. For
headless capture:

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
      --disable-gpu --dump-dom \
      file://$PWD/probes/autoplay/idl-reflection.browser.html \
      | grep -A 30 '"results"'

## Confirmed 2026-04-22

In both jsdom and Chrome headless, `element.autoplay` returns `true` for every
`<audio autoplay>`, `<audio autoplay="">`, `<audio autoplay="autoplay">`,
`<audio autoplay="false">`, and `<audio autoplay="hello">`. Only an element
without the attribute returns `false`. The lint rule's "presence == on" stance
reflects this platform behavior.
