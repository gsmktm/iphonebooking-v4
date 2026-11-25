# Design system and asset provenance

> Historical implementation note. The 6 October 2026 refresh is documented in [ARCHITECTURE.md](../ARCHITECTURE.md), [API.md](../API.md), [DEPLOYMENT.md](../DEPLOYMENT.md) and [TESTING.md](../TESTING.md). Those files supersede older payment/mail, homepage, build-command and verification claims below.

Original direction (retained on internal store pages): warm neutral storefront, graphite typography, restrained crimson, pale sage service surfaces, and deep Himalayan navy for the brand story. Product presentation leads; Nepal identity is limited to the mountain mark, geographic reference, altitude motif, and one campaign section.

CSS token source: `src/styles/tokens.css`. Layout rules use 640, 768, 1024, and 1280 px enhancement breakpoints. The main container caps at 1320 px. The store uses a category strip, product grid, two service panels, ownership benefits, and a Himalayan brand story. The operations interface uses a separate compact workspace/sidebar/table system. Interaction states include focus rings, native modal focus management, pending/disabled actions, skeletons, empty states, and contextual errors. Reduced motion disables transitions and animations.

Mobile layouts have a separate navigation panel, horizontally scrollable category filters, persistent product purchase control, stacked configuration/checkout, and scrollable comparison tables. No image remote dependency is required at runtime.

## Original generated assets

Both images were generated with the built-in image generation tool, then saved in this workspace. WebP copies are used by the application. Original files are kept for provenance; they are excluded from the Docker context.

- `docs/assets/hero-original.png` → `public/images/hero.webp` (about 48 KB)
- `docs/assets/catalog-original.png` → `public/images/catalog.webp` (about 91 KB)

These are illustrative renders, not verified product photography. The catalog image is a 4×2 sprite; CSS displays a cell per product family. Live catalog imagery needs product-by-product approval and color-specific assets. The original vector mountain icon is `public/icon.svg`.

### Hero prompt

> Use case: product-mockup. Asset type: original ecommerce website hero visual for iPhoneBooking, no text. Photorealistic studio rendering of two premium desert titanium iPhone 16 Pro style smartphones, one showing the back with three large realistic camera lenses, the other front with black glass screen and subtle flowing copper colored light abstract wallpaper. Upright at slight opposing angles, devices occupying the right two-thirds of a wide landscape composition, blank warm light gray (#f4f3f0) background on left for text overlay. Soft studio floor shadow, meticulous metal edges, realistic materials, warm tonal color harmony. Luxurious precise product photography, original composition, no words, no watermarks, no brand logos. Wide landscape 1536x1024. Both devices entirely in frame.

### Catalog prompt

> Use case: product-mockup. Asset type: original ecommerce catalog contact sheet. Create a clean 4 column by 2 row grid of 8 photorealistic studio product renders. Landscape canvas 1536x1024, every cell exactly equal dimensions. Background throughout uniform very light warm grey #f4f3f0. No grid borders, no text, no numbers, no logos. EACH product fully inside its own cell with abundant 20% margins so none touches cell edges. TOP ROW from left: (1) premium desert titanium smartphone back with three cameras and front phone behind it with copper wallpaper, (2) thin silver open laptop with dark blue abstract wallpaper, (3) slim silver tablet in landscape angled slightly with a pastel blue purple wallpaper, (4) black smartwatch with soft black loop band and minimal colorful face. BOTTOM ROW from left: (5) pair of white wireless earbuds in open white charging case, (6) sleek mixed reality goggles with silver body and soft white head strap, (7) charcoal fabric spherical smart speaker, (8) white circular magnetic wireless charger and elegantly coiled white cable. Soft realistic shadows and consistent camera studio lighting. Original photographic composition suitable for premium technology store. No text anywhere.

## Testing boundary

Axe checks the homepage against its automated WCAG A/AA rule set. Browser layout tests cover five viewport widths and several key pages. This is not a screen-reader audit, a complete all-page conformance test, or an assertion of Apple affiliation.

## User-supplied Himalayan header banner

The homepage now uses the user-provided `banner.png`, copied unchanged to `public/images/himalayan-banner.png` (1916 × 821, about 1.8 MB). The original studio hero remains for other existing metadata references. No new image generation or alteration of the supplied artwork was performed.

The headline is “Your Apple world. From the Himalayas.” The supporting copy and collection link are editable in the homepage CMS block; the local page was updated through the authorized, audited content endpoint. The seed and translation fallback use the same copy. Copy overlays the open left side on desktop and sits above the artwork below 1024px. The image has descriptive alternative text, explicit dimensions and high fetch priority; the compiled homepage preloads it and uses it as its social preview.

Banner/navigation layout was checked at 320, 375, 414, 768, 1024, 1440 and 1920px, including the collection button destination. The narrow navigation keeps 44px utility controls. The supplied PNG remains full resolution; production CDN image derivatives and field performance measurement remain deployment work.

## Navy and gold homepage — 22 September 2026

The supplied concept screenshot informs the homepage palette and compact panel layout: midnight `#071014`, panel `#101b20`, gold `#dec28d`, and muted text `#b9c3c7`. Its product names, prices, payment brands, and IMEI authenticity claims are not catalog data. The supplied Himalayan banner remains unchanged on disk, with a CSS tint and readable text layer. Product illustration backgrounds remain neutral to preserve their colors.

React/Vite now uses Tailwind through its official Vite plugin; theme and utilities are imported without Preflight to preserve existing components. Layout utilities live alongside scoped campaign styles in `src/styles/luxe.css`. `cn()` handles conditional utility classes. See [Tailwind Vite setup](https://tailwindcss.com/docs/installation/using-vite).

The homepage includes database-backed category/product cards, a color/storage configurator using actual variant prices and cart actions, trade-in, repair, device ownership, support, and store links. CMS hero copy is retained. The full homepage block editor and translation coverage remain unfinished.

Mobile uses bottom navigation with safe-area spacing; existing checkout/product purchase actions take precedence. The manifest supports standalone installation, icons, and useful shortcuts. Installation uses the browser prompt when available, with manual instructions otherwise. This is an installable web app, not a native App Store/Play Store package. Account data and API responses are not cached. Offline navigation shows a recovery page; purchases require a connection.
