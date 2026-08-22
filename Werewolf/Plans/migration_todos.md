# Landing Page Migration Todos

## Reference-faithful structure

- [x] Remove the CSS-generated alley scene from the landing-page markup.
- [x] Replace the exploratory alley styling with framed parchment/wood panel styling.
- [x] Add the centered Arabic title plaque.
- [x] Add framed settings and profile controls.
- [x] Arrange primary actions to match the reference hierarchy.
- [x] Use the existing village image and character artwork in the main showcase.
- [x] Keep role information and ability content in stacked framed panels.
- [x] Keep the existing role selector functional.

## RTL and responsive behavior

- [x] Apply Arabic RTL direction to the landing page.
- [x] Add Arabic landing labels and validation messages.
- [x] Keep game codes readable as LTR values.
- [x] Make mobile the primary layout.
- [x] Add desktop centered-board treatment.
- [x] Add short-screen and narrow-phone rules.
- [x] Preserve touch scrolling for role thumbnails.
- [x] Preserve reduced-motion behavior.

## Functional regression checks

- [ ] Verify Create Game reaches the waiting room.
- [ ] Verify Join Game accepts valid six-character codes.
- [ ] Verify invalid name/code errors remain visible.
- [ ] Verify player-name persistence and profile editing.
- [ ] Verify settings and How-to-Play overlays.
- [ ] Verify character switching and ability content.
- [ ] Verify keyboard focus and Escape-to-close behavior.
- [ ] Verify non-landing routes are unchanged.

## Visual QA

- [ ] Compare phone screenshot against the reference composition.
- [ ] Compare desktop screenshot against the reference composition.
- [ ] Check title, button, showcase, plaque, and ability proportions.
- [ ] Check no artwork or Arabic text is clipped.
- [ ] Check focus states and color contrast.
- [ ] Run `npm run build` from `Front-End`.
- [ ] Run `npm run lint` from `Front-End`.

## Future artwork handoff

- [ ] Replace temporary village background when supplied.
- [ ] Replace temporary hero character artwork when supplied.
- [ ] Replace temporary decorative/card artwork when supplied.
- [ ] Recheck cropping and focal points at mobile and desktop sizes.
