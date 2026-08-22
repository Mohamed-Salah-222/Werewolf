# Landing Page UI Migration Plan

## Goal

Make the `/` landing page closely resemble `refs/new_ui.png`: a tall Arabic RTL game board built from parchment, wood, leather, and antique-gold panels. The supplied PNG remains a visual reference; future supplied artwork will replace the temporary artwork later.

## Current implementation

The landing page is implemented in `Front-End/src/pages/HomePage.tsx` and `HomePage.css`. It owns the character showcase, role selector, create/join dialogs, profile name editing, settings surface, and How-to-Play entry point. The current exploratory CSS-generated alley scene is not part of the target design and should not be extended.

## Target composition

- Full-page dark brown background with a centered, double-bordered parchment board on desktop.
- Compact header with framed settings/profile buttons and a centered wooden Arabic title plaque.
- Three dark wooden primary actions: How to Play, Join Game, and Create Game.
- One large framed showcase panel using the existing village background and selected character art as temporary content.
- A wooden role/team information plaque below the artwork.
- A darker ability panel below or inside the information region.
- Existing role thumbnails/cards in a touch-scrollable selector.
- Arabic RTL layout, with LTR handling for game codes and mixed Latin values.

## Implementation rules

- Keep create, join, profile, settings, How-to-Play, API, socket, session, and routing behavior unchanged.
- Use CSS for framing, texture, depth, and responsive layout; do not draw a replacement alley illustration in CSS.
- Centralize temporary artwork references so future artwork can be swapped without changing functional components.
- Use logical RTL-safe CSS properties where possible.
- Make the page content-driven on small screens; do not hide essential content behind fixed-height overflow.
- Preserve reduced-motion support, keyboard focus, modal dismissal, and touch-friendly targets.

## Temporary assets

- `/assets/backgrounds/village.png` for the showcase background.
- Existing `*_2d.webp` assets for the selected character.
- Existing `*_square.webp` assets for the role selector.
- Existing role-card assets for optional panel decoration or future role presentation.

## Validation

- Test 320–430px phones, short-height phones, landscape phones, tablets, and desktop widths.
- Confirm Arabic wrapping, game-code input, modal behavior, carousel scrolling, and character switching.
- Run the frontend TypeScript build and ESLint.
- Verify Create Game, Join Game, How to Play, profile editing, and settings behavior.
- Confirm non-landing game routes remain unaffected.
