• Proposed Plan


  # Landing Page UI Migration Plan

  ## Summary

  Create two planning documents:

  - Werewolf/Plans/migration_plan.md
  - Werewolf/Plans/migration_todos.md

  The migration will redesign only the landing page at / into an Arabic RTL, mobile-first interface inspired by refs/new_ui.png.

  The new artwork will be integrated later. Until then, the page will use existing assets such as:

  - village.png as the temporary scene background
  - Existing *_2d.webp character illustrations
  - Existing role-card artwork
  - Existing square character thumbnails

  All create-game, join-game, how-to-play, session-storage, API, socket, and routing behavior will remain intact.

  ## Interim Visual Direction

  - Warm parchment, wood, leather, and ink palette
  - Dark brown outer frame with gold highlights
  - Layered panels with borders, shadows, texture, and subtle bevels
  - Arabic RTL typography and right-to-left content flow
  - Mobile-first vertical composition
  - Desktop layout expands into a centered framed game board
  - Temporary character showcase replaces the illustrated pigeon artwork
  - Existing village background is used behind the main showcase area
  - Existing character cards and thumbnails are reused until new artwork is supplied

  Suggested design tokens:

  - Parchment: #c6a16c
  - Light parchment: #e0bf86
  - Dark wood: #3b2415
  - Deep wood: #21150e
  - Ink: #171310
  - Gold accent: #d59b3e
  - Muted gold: #9d6d2d
  - Village green: #526b45
  - Werewolf red: #8d3d32
  - Neutral amber: #b27a2d

  ## Migration Changes

  ### Landing page structure

  Refactor HomePage.tsx into semantic visual sections:

  1. Framed page shell
  2. Header with:
      - Settings button
      - Arabic game title
      - Profile/player button

  3. Primary action buttons:
      - How to play
      - Join game
      - Create game

  4. Main showcase panel:
      - Existing village scene background
      - Selected character illustration
      - Arabic role/team title
      - Role description
      - Ability panel

  5. Responsive role-card carousel
  6. Create-game and join-game dialogs
  7. Existing How-to-Play dialog

  The selected-character behavior should remain functional, but its presentation should change from the current dark sci-fi showcase into the framed parchment/wood layout.

  ### RTL and localization

  - Set landing-page direction to rtl.
  - Replace visible landing-page labels with Arabic equivalents.
  - Preserve technical values such as game codes and player names in appropriate LTR controls.
  - Ensure mixed Arabic/Latin content remains readable.
  - Add accessible Arabic labels and aria-label values for icon-only buttons.
  - Keep validation and error messages consistent with the new language direction.

  ### Responsive behavior

  Mobile-first requirements:

  - The landing page must scroll naturally on short phone screens.
  - Buttons must be full-width or two-column where appropriate.
  - Character artwork must scale without cropping important content.
  - Role cards must support touch scrolling.
  - Dialogs must fit within the viewport and respect safe-area insets.
  - Minimum interactive target size: approximately 44px.
  - Avoid fixed-height layouts that hide content on small devices.

  Desktop requirements:

  - Center the interface inside a constrained game-board frame.
  - Use the extra width for larger artwork and a more spacious showcase.
  - Keep primary actions visually grouped near the top.
  - Prevent the temporary background from becoming visually stretched.
  - Preserve readable text widths and balanced RTL alignment.

  ### Artwork replacement seam

  Implement the temporary artwork in a way that makes future replacement simple:

  - Keep background, hero character, card thumbnails, and decorative assets as replaceable imports or data fields.
  - Avoid baking temporary artwork assumptions into layout logic.
  - Keep the future supplied artwork separate from functional controls and text.
  - Support replacing the temporary showcase image without changing create/join flows.

  ### Accessibility and interaction

  - Use semantic headings, buttons, labels, and dialog structure.
  - Add keyboard focus states that remain visible against the dark wood panels.
  - Support Escape-to-close for dialogs.
  - Prevent background interaction while dialogs are open.
  - Respect prefers-reduced-motion.
  - Ensure selected character state is announced or otherwise distinguishable.
  - Preserve usable focus behavior for create/join forms.

  ### Styling organization

  Update the global theme variables in Front-End/src/index.css.

  Replace the current landing-specific styling in Front-End/src/pages/HomePage.css with:

  - Page-frame styles
  - Wood/parchment panel styles
  - RTL typography rules
  - Responsive layout rules
  - Temporary-artwork composition rules
  - Shared button, card, modal, and focus states

  Avoid changing game-phase styles unless a shared global token change causes an intentional compatibility issue.

  ## Migration Todos

  ### Discovery and preparation

  - [ ] Confirm the final Arabic game title and landing-page copy.
  - [ ] Confirm whether Arabic font files will be supplied or whether a web-safe/Google font fallback is acceptable.
  - [ ] Inventory the best temporary character and card assets for the showcase.
  - [ ] Verify existing create, join, and How-to-Play flows before visual changes.
  - [ ] Record baseline screenshots at phone, tablet, and desktop widths.

  ### Design foundation

  - [ ] Add parchment/wood/gold color tokens.
  - [ ] Add RTL-safe typography and spacing tokens.
  - [ ] Define page max-width, mobile gutters, panel radii, border, shadow, and texture rules.
  - [ ] Define temporary-artwork replacement points.
  - [ ] Remove or replace landing-page styles that depend on the old sci-fi theme.

  ### Landing-page implementation

  - [ ] Rebuild the landing-page shell around the new framed layout.
  - [ ] Add Arabic RTL header and title treatment.
  - [ ] Restyle the three primary actions.
  - [ ] Recompose the main character showcase using existing assets.
  - [ ] Add Arabic team, role, description, and ability presentation.
  - [ ] Restyle the character-card carousel for touch and mouse use.
  - [ ] Preserve selected-character transitions with reduced-motion support.
  - [ ] Restyle create-game and join-game dialogs.
  - [ ] Restyle and RTL-enable the How-to-Play modal.
  - [ ] Add accessible labels, focus states, and keyboard handling.

  ### Responsive QA

  - [ ] Test narrow phones around 320–360px wide.
  - [ ] Test common phones around 390–430px wide.
  - [ ] Test tablet widths.
  - [ ] Test desktop widths around 1280px and above.
  - [ ] Test portrait and landscape phone layouts.
  - [ ] Test short viewport heights.
  - [ ] Test Arabic text wrapping and mixed game-code/name input.
  - [ ] Test touch scrolling for the role carousel.
  - [ ] Test dialogs with the virtual keyboard open.

  ### Regression validation

  - [ ] Verify Create Game still calls the existing API.
  - [ ] Verify Join Game still validates code and player name.
  - [ ] Verify socket connection and navigation behavior are unchanged.
  - [ ] Verify session-stored player names still populate forms.
  - [ ] Verify How to Play tabs and role information remain complete.
  - [ ] Verify all non-landing game routes still build and render.
  - [ ] Run TypeScript build.
  - [ ] Run ESLint.
  - [ ] Compare before/after screenshots at the defined viewport sizes.

  ## Acceptance Criteria

  - The / page visually follows the reference’s parchment, wood, framed-panel direction.
  - The landing page is Arabic RTL.
  - The experience is mobile-first and usable on small screens without clipped content.
  - Desktop layouts remain balanced and do not look like an enlarged mobile page.
  - Existing artwork is used successfully as temporary content.
  - New artwork can later replace the temporary hero/background assets without restructuring the page.
  - Create, join, and how-to-play functionality continues to work.
  - No game-phase route or socket behavior is unintentionally changed.
  - TypeScript build and lint pass.
  - Keyboard, touch, reduced-motion, and dialog interactions remain usable.

  ## Assumptions

  - Scope is limited to the landing page for this migration.
  - Arabic copy will be authored during implementation based on the reference unless final copy is supplied.
  - New artwork will be supplied later as separate assets.
  - The supplied artwork will not be used as the current page background.
  - Existing role data and game behavior remain the source of truth.
  - The planning documents will be created under Werewolf/Plans/.
