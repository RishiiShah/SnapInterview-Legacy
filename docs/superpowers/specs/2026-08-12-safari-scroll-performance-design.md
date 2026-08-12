# Safari Scroll Performance Design

## Goal

Find and remove the root causes of visibly laggy Safari scrolling without degrading the intended desktop experience or relying on browser-specific guesses.

## Current Evidence

The landing page attaches multiple scroll observers. The navigation uses Framer Motion’s `useScroll` and sets React state as scrolling crosses its threshold; the active-section hook performs layout reads on every scroll event. The same surface animates `backdrop-filter`, size, and shadow. The page also has large blurred atmospheric layers and an SVG-turbulence grain overlay.

The authenticated dashboard is a second candidate: it uses a nested `h-screen` scroll container while a full-shell gradient and SVG-turbulence grain layer remain behind the scrolling content.

These are likely Safari paint/compositing and main-thread costs, not a confirmed diagnosis. No visual adjustment is accepted until profiling identifies the dominant cost.

## Investigation Protocol

1. Capture Safari Web Inspector Timelines for a repeatable slow scroll on the landing page and a content-heavy dashboard page, noting FPS, long frames, scripting, layout, paint, and compositing work.
2. Capture an equivalent Chromium trace as a baseline, not as proof that Safari is correct or wrong.
3. Disable one suspect at a time in a local diagnostic build: active-section scroll work, navbar blur animation, atmospheric blurs, grain layer, and dashboard nested scroll shell. Re-profile after every single-variable change.
4. Record the before/after frame distribution and select changes only when they improve Safari without introducing layout or accessibility regressions.

## Candidate Fixes

- Coalesce scroll-derived UI work to one `requestAnimationFrame` update, and avoid state changes unless the derived value actually changed.
- Replace the active-section scroll handler’s repeated layout reads with an `IntersectionObserver`, plus an explicit bottom-of-page check where needed.
- Keep navigation geometry transitions but do not animate `backdrop-filter`; use a static blur value or a non-blurred opaque background for the compact state.
- Replace full-page SVG-turbulence grain with a small static raster texture, or disable the grain and large atmosphere blur layers for Safari after profile confirmation.
- Ensure offscreen decoration does not create unnecessary paint regions; do not apply `will-change` broadly or permanently.
- Evaluate whether the dashboard can retain its layout while the document scrolls, or isolate and simplify its decorative background if nested scrolling is confirmed as the costly behavior.

## Constraints

- Preserve reduced-motion behavior and keyboard/focus navigation.
- Do not reduce scrolling quality by adding throttled lag to navigation state.
- Use feature detection only when Safari has a confirmed, measurable regression; do not use user-agent sniffing.
- Maintain the current visual direction where the performance trace shows it is affordable.

## Verification

Verify the changed landing page and dashboard in Safari and Chromium at desktop and mobile widths. Run relevant component tests, lint, typecheck, production build, and Playwright smoke tests. Document the trace evidence and the measured result in the implementation PR or change log.
