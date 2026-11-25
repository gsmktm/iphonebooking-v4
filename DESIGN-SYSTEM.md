# Design system

The visual direction is deep navy, restrained antique gold, real device data and a Himalayan landscape. All headings, prices, controls, cards and statuses are DOM elements. No website screenshot is used as the interface.

## Tokens and typography

`apps/web/src/styles/tokens.css` owns semantic colors, typography, spacing and radii. Light-mode semantic overrides live in the same file. Existing `--canvas`, `--ink`, `--gold` and related names alias the semantic values to preserve existing components.

| Token                                                                  | Purpose / dark value                              |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| `--color-page`                                                         | Page canvas, `#071014`                            |
| `--color-surface`, `--color-surface-elevated`                          | Panels and raised controls, `#101b20` / `#18262e` |
| `--color-text`, `--color-text-muted`                                   | Primary/secondary content, `#f3f1ec` / `#abb7bd`  |
| `--color-brand`, `--color-brand-hover`                                 | Gold actions, `#dec28d` / `#efdab3`               |
| `--color-brand-on-dark`                                                | Legible accent text; adapts in light mode         |
| `--color-border`, `--color-focus`                                      | Dividers and visible keyboard focus               |
| `--color-success`, `--color-warning`, `--color-danger`, `--color-info` | Meaningful status text; paired semantic surfaces  |
| `--radius-control`, `--radius-card`, `--radius-panel`                  | 8 / 12 / 16 px                                    |
| `--space-1` through `--space-24`                                       | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px       |

Inter is the UI/data face. Instrument Serif is the editorial/display face, with a real italic font for emphasis. Three self-hosted WOFF2 files use `font-display: swap`; their SIL Open Font Licenses are stored alongside them under `apps/web/public/fonts`. Additional scripts/locales need their own font coverage and translation review; this is not complete Nepali localization.

`world.css` now consumes these shared tokens and defines component identity rather than another palette. Obsolete campaign selectors were removed from `luxe.css` and `appearance.css`; the hero has one scoped stylesheet. Existing page/category/admin styling is retained for compatibility. Remaining legacy component decoration can be migrated incrementally without introducing a second design system.

## Composition and behavior

- Shared buttons have at least 48 px height; primary actions are gold and secondary actions use a border. Header icon targets are 44 px. Focus remains visible, including in light mode.
- Forms use persistent labels, 16 px input text, explicit errors and disabled/busy states. Dialogs support keyboard dismissal and focus handling. Status labels carry readable text as well as color.
- Layout starts with one column. Grids add columns at content-appropriate widths. Shared containers cap at 1320 px; desktop gutters expand at 768 px. Navigation adapts around 1024/1280 px and uses a mobile dialog below desktop width.
- Product names, configurations, price, stock and availability come from the API. Review and article sections have honest empty states. International observations link to research sources and do not claim live worldwide stock.
- Images declare dimensions; the hero background uses an 800 px mobile source and a 1536 px desktop source. Decorative landscape/map graphics have no redundant accessible narration. Motion respects `prefers-reduced-motion`.

Homepage composition: utility bar → header → hero → trust → quick actions → paired product spotlights → iPhone configurator → device finder → filtered ecosystem rail → personal shelves when populated → reasons → trade-in/repair → store network → price intelligence → journey → verified reviews → journal → final CTA → footer. CMS configures the first hero and fourteen keyed section headings, supported destinations and visibility. Catalog and review content are independently sourced from the database.

The [Apple homepage](https://www.apple.com/) was reviewed on 6 October 2026 for its product spotlights and paired learning/purchase actions. The implementation retains iPhoneBooking's own visual identity, copy and catalog assets. It does not import Apple's US inventory, announcements or pricing into the Nepal catalog.

Device-family chips and the collection selector request bounded server-filtered results, including honest empty and retry states. Product rails use native scrolling, scroll snapping, labeled arrow controls and reduced-motion support. Quick look opens a native modal, refreshes product price and stock, supports real configuration/cart actions, and preserves the chosen variant in its detail link. Pickup availability changes with the configuration; checkout selects and rechecks the actual fulfillment location.

The finder filters by family, an optional budget in NPR and stock preference. It shows matching configurations by price rather than inventing suitability claims. Personal shelves fetch active products again rather than displaying cached prices. Recently viewed history contains only eight public product IDs in session storage, survives a reload in the current tab, and includes a clear-history action.

Responsive checks cover 320, 375, 414, **430**, 768, 1024, 1440 and 1920 px. Automated WCAG AA checks cover both homepage themes and the existing device passport journey; whole-site screen-reader, physical-device and manual accessibility review remain launch work. See [TESTING.md](TESTING.md).

## Image provenance

Mode: **generate** using the built-in `image_gen` tool. No reference image or screenshot was supplied to the tool. The output is landscape artwork only.

Original saved path: `docs/assets/himalayas-v2-original.png` (1536 × 1024). Served assets: `apps/web/public/images/himalayas-v2.jpg` and `himalayas-v2-800.jpg`; these are compressed JPEG derivatives. The original is retained for future exports.

Prompt:

> Use case: photorealistic-natural. Asset type: standalone panoramic website background for iPhoneBooking.com, a premium Nepal-built commerce site. A cinematic photographic view of the Nepal Himalayan mountain range at blue hour. Layered deep navy mountains and a sharply detailed snow-covered peak toward the right, gentle antique-gold first light grazing the upper ridgeline, thin mist in the valleys, subtle stars in a dark sky. Wide 3:2 composition, large dark uncluttered negative space toward the left for real HTML overlay. Quiet, sophisticated, technically precise photographic art direction. This is landscape artwork only, not a website mockup. NO text, NO logos, NO devices or electronics, NO interface elements, NO sun/moon icons, NO temples, NO people, NO watermark. Natural rock and snow texture. Near-black deep navy overall palette with restrained warm champagne highlights.

This is AI-generated illustration, not an authenticated photograph of a named peak. Existing product illustrations remain visibly identified as development assets. Commercial device photography and approved catalog specifications must replace development examples before launch.
