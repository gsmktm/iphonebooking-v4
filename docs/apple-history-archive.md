# Apple Device History — iPhoneBooking research archive

**Data snapshot:** 27 November 2026 · **Scope:** independent historical information, not local offers.

## Coverage and data sources

The project imports a structured product-history timeline from **Apple Support identification guides** and select dated Apple Newsroom records. The initial build has roughly 300 Apple device records from the Macintosh era to 2026, across four families.

- **iPhone:** [Identify your iPhone model](https://support.apple.com/en-us/108044), from original 2007 iPhone onward.
- **iPad:** [Identify your iPad model](https://support.apple.com/en-us/108043), including Wi-Fi and cellular model identifiers when Apple documents them.
- **iPod:** [Identify your iPod model](https://support.apple.com/en-us/103823), including iPod, classic, touch, nano, shuffle and mini. The [2001 original announcement](https://www.apple.com/newsroom/2001/10/23Apple-Presents-iPod/) provides the first release date.
- **Mac:** [MacBook](https://support.apple.com/en-us/103257), [MacBook Air](https://support.apple.com/en-us/102869), [MacBook Pro](https://support.apple.com/en-us/108052), [iMac](https://support.apple.com/en-us/108054), [Mac mini](https://support.apple.com/en-us/102852), [Mac Studio](https://support.apple.com/en-us/102231), [Mac Pro](https://support.apple.com/en-us/102887), plus Apple Newsroom milestones for original Macintosh (1984), iMac G3 (1998), Mac mini (2005), and support's PowerBook 170 specifications (1991).
- **Secondary reading:** [GSMArena Apple archive](https://www.gsmarena.com/apple-phones-48.php). Apple phone/tablet index spans four pages and also contains Apple Watch, but does not cover all Mac and iPod models. No bulk GSMArena descriptions, review text or site photos were copied.

Original GSMArena terms: https://www.gsmarena.com/terms.php3. Terms restrict copying, modification, and commercial reproduction without written permission. Hence factual independently validated model names and links—not a mirrored GSMArena database—are stored.

Data fields: Apple model name, family, year introduced, identified A-number/model identifier where known, original capacity when documented, chip when documented, Apple Support source URL, optional secondary historical reference, verification date, optional licensed photograph URL and attribution.

The archive table `AppleHistoryDevice` is entirely separate from `Product` and `ProductVariant`: history records never authorize pricing, stock, pre-orders, repair eligibility or checkout.

## Photographs, provenance, and licensing

The first release contains a small curated selection of **Wikimedia Commons** photographs of iconic models, with exact file page, artist credit, license name, and license-deed link. License metadata was checked through Wikimedia's official `imageinfo` API with `extmetadata`. Records lacking a verified photo display a clear fallback and a link to search for historical pictures; they never substitute a fabricated or AI-generated product photo.

Licenses are per image (e.g. CC BY 2.0, CC BY-SA 4.0, CC0). Images under CC BY/CC BY-SA must keep author credit and links to source and relevant license; share-alike obligations may apply to adaptations. Album or product marketing rights are not granted merely by Apple source pages; verify every asset before expanding licensed coverage.

A collection of roughly 300 models does not mean every Apple product revision or accessory in history is indexed. The Apple identification pages themselves omit some older revisions, and Mac model suffixes can represent hardware variants. Additions require individual factual verification and source attribution.

## User experience

- `/history/apple` all devices in chronological groups.
- `/history/apple/iphone`, `/history/apple/mac`, `/history/apple/ipad`, `/history/apple/ipod` family timelines.
- `/history/apple/device/:slug` individual entries with source and image attribution.
- API `GET /api/v1/apple-history/summary`, `GET /api/v1/apple-history?family=iphone&year=2007&q=...&page=1&pageSize=48` and `GET /api/v1/apple-history/:slug`.
- Records are sorted by year and paginated. History and retail catalogs remain separate.

## Verification and future expansion

- Run the new migration on isolated CI PostgreSQL first, then on Railway's isolated Supabase-backed preview after validation.
- API should return more than 280 archival records, all four families, earliest 1984, and only provenance-backed images.
- Verify mobile, tablet, desktop layouts and distinct History menu. Watch for broken Commons URLs and potential hotlink limitations; when necessary, store explicitly licensed thumbnail copies in a controlled Media Library with credits.
- Additional historical families/variants and an image-licensing review queue can extend coverage without guessing source details.
- Do not expose secrets or enable public Supabase Data API grants. API access remains mediated by the existing Express service, and the custom `iphonebooking` schema remains private.
