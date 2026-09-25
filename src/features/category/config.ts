import {
  Cpu,
  Camera,
  ShieldCheck,
  BatteryCharging,
  Sparkles,
  Waves,
  Monitor,
  Workflow,
  Fingerprint,
  Pencil,
  Keyboard,
  HeartPulse,
  Activity,
  Gauge,
  Compass,
  Droplets,
  Volume2,
  Bluetooth,
  Magnet,
  Zap,
  BadgeCheck,
  CreditCard,
  Truck,
  Store,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import type { Product } from '../../services/types';
import type { Copy, Feature, FaqItem } from './sections';

export type CategoryConfig = {
  slug: string;
  docTitle: string;
  /** query string for /products — null returns the whole catalogue */
  query: string | null;
  eyebrow: string;
  headline: string;
  intro: (hero: Product) => string;
  lineup: Copy;
  features: Copy & { items: Feature[] };
  specs: Copy;
  services: Copy;
  faq: Copy & { items: FaqItem[] };
  /** quick category links rendered under the tab bar (store hub) */
  chips?: { label: string; to: string }[];
  /** labels for the hero configurator rows (defaults: Storage / Colour) */
  dimLabels?: { storage?: string; color?: string };
};

/* ── iPhone ── */
const iphone: CategoryConfig = {
  slug: 'iphone',
  docTitle: 'iPhone in Nepal — prices, specs & pre-order — iPhoneBooking',
  query: 'category=iphone',
  eyebrow: 'IPHONE · SEPTEMBER 2026',
  headline: 'The line-up, in Nepal.',
  intro: (h) =>
    `${h.name} — “${h.tagline}”. Choose a configuration to see live pricing, then buy, pre-book or reserve in-store pickup.`,
  lineup: {
    eyebrow: 'THE LINE-UP',
    title: 'Every iPhone. One place.',
    description:
      'Live stock and Nepal pricing. Save to your wishlist or add to compare straight from the card.',
  },
  features: {
    eyebrow: "WHAT'S NEW",
    title: 'Serious silicon. Cooler by design.',
    description:
      "The story behind the current iPhone line-up — the same technology you'll read on apple.com, with Nepal pricing attached.",
    items: [
      {
        Icon: Cpu,
        tag: 'Performance',
        name: 'A20 Pro, cooled',
        body: 'Vapor-cooled A20 Pro with Neural Accelerators keeps sustained performance steady through games, editing and on-device AI.',
      },
      {
        Icon: Camera,
        tag: 'Camera',
        name: '48MP Fusion, variable aperture',
        body: 'A physical variable aperture pairs with the 48MP Fusion sensor for natural low-light depth — then 4K 120 fps Dolby Vision when it matters.',
      },
      {
        Icon: ShieldCheck,
        tag: 'Durability',
        name: 'Ceramic Shield 2',
        body: 'Front and back Ceramic Shield 2 with a titanium frame — tougher glass, lighter feel, built for a decade of everyday Nepal.',
      },
      {
        Icon: BatteryCharging,
        tag: 'Battery',
        name: 'All-day, then some',
        body: 'Efficiency that stretches further between charges, with fast-charge over USB-C when you do plug in.',
      },
      {
        Icon: Sparkles,
        tag: 'Intelligence',
        name: 'On-device intelligence',
        body: 'Neural Accelerators run language and image models privately, right on the phone — no round trip required.',
      },
      {
        Icon: Waves,
        tag: 'Display',
        name: 'ProMotion + Dynamic Island',
        body: 'Up to 120Hz adaptive Super Retina XDR, with Dynamic Island carrying alerts, Live Activities and controls in real time.',
      },
    ],
  },
  specs: {
    eyebrow: 'SPECS',
    title: 'Compare at a glance.',
    description:
      'Live specifications from the iPhoneBooking catalogue. Add two or more models for a full side-by-side.',
  },
  services: {
    eyebrow: 'KEEP IT GOING',
    title: 'The rest of the story.',
    description:
      'Owning an iPhone is a long game — upgrading, protecting and repairing all live one tap away.',
  },
  faq: {
    eyebrow: 'GOOD TO KNOW',
    title: 'Questions, answered.',
    description: 'The short version of how buying an iPhone here works.',
    items: [
      {
        q: 'Are these iPhones genuine for Nepal?',
        a: 'Every iPhone sold here is an official, warranty-backed unit with an IMEI you can check before you buy. Your device, serial and warranty record are stored in your account after purchase.',
      },
      {
        q: 'How does pre-order work?',
        a: 'Reserve an available configuration with a store payment. Your reservation is held for 24 hours, and allocation is confirmed after payment — track the whole journey from your account.',
      },
      {
        q: 'Can I trade in my current phone?',
        a: 'Yes. Share the model, storage and condition to get an instant estimate, then apply the credit against your next iPhone. A specialist confirms the final value on inspection.',
      },
      {
        q: 'What happens if something goes wrong?',
        a: 'Book a repair with the issue and photos, approve the quote we send back, and follow parts, labour and warranty status live. Warrantied work comes with its own warranty days.',
      },
      {
        q: 'Where can I see my orders and devices?',
        a: 'Everything lands in your account: orders and tracking, pre-orders, repairs, trade-ins — plus My Devices with purchase history, masked serials and warranty dates.',
      },
      {
        q: 'How do I know a listing is in stock?',
        a: 'Stock is live per configuration and per store. If a configuration shows availability, it can be reserved or bought right away; otherwise you can pre-book the next allocation.',
      },
    ],
  },
};

/* ── Mac ── */
const mac: CategoryConfig = {
  slug: 'mac',
  docTitle: 'Mac in Nepal — MacBook, iMac & live pricing — iPhoneBooking',
  query: 'category=mac',
  eyebrow: 'MAC · M5 GENERATION',
  headline: 'Make room for your big ideas.',
  intro: (h) =>
    `${h.name} — “${h.tagline}”. Configure storage, see Nepal pricing in real time, and take it home with EMI or trade-in credit.`,
  lineup: {
    eyebrow: 'THE LINE-UP',
    title: 'Every Mac. One place.',
    description:
      'Live stock and Nepal pricing across MacBook Air, MacBook Pro and the desktop line.',
  },
  features: {
    eyebrow: "WHAT'S NEW",
    title: 'M5 silicon. Cooler, quieter, faster.',
    description:
      'The story behind the current Mac line-up — the same technology you will read on apple.com, with Nepal pricing attached.',
    items: [
      {
        Icon: Cpu,
        tag: 'Performance',
        name: 'M5 family performance',
        body: 'Multi-core CPU and GPU headroom for compiling, editing and layering dozens of browser tabs — with fan-quiet efficiency across the line.',
      },
      {
        Icon: Monitor,
        tag: 'Display',
        name: 'Liquid Retina XDR',
        body: 'Reference-grade dynamic range for colour-critical work, with nano-texture glass taming glare in bright Kathmandu rooms.',
      },
      {
        Icon: Sparkles,
        tag: 'Intelligence',
        name: 'Apple Intelligence, built in',
        body: 'Writing tools, image playground and Siri upgrades run on-device where possible — private by design, in English and more.',
      },
      {
        Icon: BatteryCharging,
        tag: 'Battery',
        name: 'All-day, every day',
        body: 'Up to a full working day between charges, and fast-charge over USB-C when the outlet finally calls.',
      },
      {
        Icon: Workflow,
        tag: 'Continuity',
        name: 'Your iPhone, on the big screen',
        body: 'iPhone Mirroring, Handoff, Universal Clipboard and AirDrop keep the whole desk in one flow — no cables required.',
      },
      {
        Icon: Fingerprint,
        tag: 'Security',
        name: 'Touch ID & FileVault',
        body: 'Unlock, pay and authorise with a finger — with the Secure Enclave keeping your keys on the machine.',
      },
    ],
  },
  specs: {
    eyebrow: 'SPECS',
    title: 'Compare at a glance.',
    description:
      'Live specifications from the catalogue — chip, display, storage and Nepal price for every Mac.',
  },
  services: {
    eyebrow: 'KEEP IT GOING',
    title: 'The rest of the story.',
    description:
      'Trade in the old laptop, spread the cost across EMI, and keep your new Mac protected with authorised repair.',
  },
  faq: {
    eyebrow: 'GOOD TO KNOW',
    title: 'Questions, answered.',
    description: 'The short version of buying a Mac here.',
    items: [
      {
        q: 'Do Macs come with a warranty for Nepal?',
        a: 'Yes — every Mac is an official, warranty-backed unit, and your serial and warranty dates are stored in your account device passport after purchase.',
      },
      {
        q: 'Can I pay in instalments?',
        a: 'EMI plans run at checkout across major cards and banks. Choose your plan, and the total — including any interest — is shown before you confirm.',
      },
      {
        q: 'Can I trade in my old laptop?',
        a: 'Yes. Share the model, year and condition for an instant estimate; the credit applies against your new Mac. Any condition accepted — free doorstep pickup across Nepal.',
      },
      {
        q: 'Is AppleCare+ available for Mac?',
        a: 'AppleCare+ can be added at purchase for extended hardware cover and priority support. Our repair desk also handles out-of-warranty work with a quote you approve first.',
      },
      {
        q: 'Where do you deliver?',
        a: 'Across Nepal — same-day in Kathmandu where stock allows, nationwide courier elsewhere. International shipping is available on request.',
      },
    ],
  },
};

/* ── iPad ── */
const ipad: CategoryConfig = {
  slug: 'ipad',
  docTitle: 'iPad in Nepal — prices, Pencil & keyboard support — iPhoneBooking',
  query: 'category=ipad',
  eyebrow: 'IPAD · M-SERIES & A-SERIES',
  headline: 'Your ideas. Unbound.',
  intro: (h) =>
    `${h.name} — “${h.tagline}”. Pick a configuration for live pricing, then pair it with Apple Pencil and the Magic Keyboard.`,
  lineup: {
    eyebrow: 'THE LINE-UP',
    title: 'Every iPad. One place.',
    description:
      'iPad, iPad Air, iPad mini and iPad Pro — live stock and Nepal pricing on every configuration.',
  },
  features: {
    eyebrow: "WHAT'S NEW",
    title: 'Serious chips. Paper-thin ideas.',
    description:
      'The story behind the current iPad line-up — from studio-grade OLED to a pencil that senses your squeeze.',
    items: [
      {
        Icon: Cpu,
        tag: 'Performance',
        name: 'M-class performance',
        body: 'Desktop-class chips run pro apps, Stage Manager multitasking and on-device intelligence without breaking a sweat.',
      },
      {
        Icon: Waves,
        tag: 'Display',
        name: 'Ultra Retina tandem OLED',
        body: 'Tandem OLED panels deliver reference contrast and 120Hz ProMotion — drawing, grading and reading all look right.',
      },
      {
        Icon: Pencil,
        tag: 'Creativity',
        name: 'Apple Pencil Pro',
        body: 'Squeeze, roll and haptic feedback with pixel-precise latency — plus Find My so the pencil stops disappearing.',
      },
      {
        Icon: Keyboard,
        tag: 'Productivity',
        name: 'Magic Keyboard',
        body: 'A floaty cantilever deck with a glass trackpad turns any iPad into a lap-ready workstation.',
      },
      {
        Icon: Camera,
        tag: 'Camera',
        name: 'Landscape front camera',
        body: 'The camera now sits on the long edge — perfectly framed for video calls in any orientation.',
      },
      {
        Icon: BatteryCharging,
        tag: 'Battery',
        name: 'All-day battery',
        body: 'A full day of note-taking, streaming and sketching, with USB-C charging and accessories in one port.',
      },
    ],
  },
  specs: {
    eyebrow: 'SPECS',
    title: 'Compare at a glance.',
    description:
      'Live specifications from the catalogue — chip, display, storage and Nepal price for every iPad.',
  },
  services: {
    eyebrow: 'KEEP IT GOING',
    title: 'The rest of the story.',
    description:
      'Trade in the old tablet, spread the cost across EMI, and keep it protected with authorised repair.',
  },
  faq: {
    eyebrow: 'GOOD TO KNOW',
    title: 'Questions, answered.',
    description: 'The short version of buying an iPad here.',
    items: [
      {
        q: 'Which Apple Pencil works with my iPad?',
        a: 'Each iPad model lists its supported pencil on the product page. Apple Pencil Pro pairs with the latest Air and Pro lines; older models use USB-C or 2nd-gen Pencil — ask us if you are unsure.',
      },
      {
        q: 'Can I pay in instalments?',
        a: 'Yes — EMI plans run at checkout across major cards and banks, with the full cost shown before you confirm.',
      },
      {
        q: 'Can I trade in my old tablet?',
        a: 'Share the model, storage and condition for an instant estimate, then apply the credit against your new iPad. A specialist confirms the final value on inspection.',
      },
      {
        q: 'Is the warranty valid in Nepal?',
        a: 'Every iPad is an official, warranty-backed unit. Your serial and warranty dates live in your account after purchase, and repairs are handled by our authorised service desk.',
      },
      {
        q: 'Do you deliver outside Kathmandu?',
        a: 'Yes — nationwide courier across Nepal, same-day in Kathmandu where stock allows, and international shipping on request.',
      },
    ],
  },
};

/* ── Apple Watch ── */
const watch: CategoryConfig = {
  slug: 'watch',
  docTitle: 'Apple Watch in Nepal — Series, Ultra & live pricing — iPhoneBooking',
  query: 'category=watch',
  dimLabels: { storage: 'Case size', color: 'Colour' },
  eyebrow: 'APPLE WATCH · SERIES 12 / ULTRA',
  headline: 'A healthier connection.',
  intro: (h) =>
    `${h.name} — “${h.tagline}”. Choose case size, band and connectivity for live pricing, then buy or reserve pickup.`,
  lineup: {
    eyebrow: 'THE LINE-UP',
    title: 'Every Apple Watch. One place.',
    description:
      'Series, Ultra and SE — live stock, Nepal pricing and band options for every wrist.',
  },
  features: {
    eyebrow: "WHAT'S NEW",
    title: 'Health on your wrist. Fitness on tap.',
    description:
      'The story behind the current Apple Watch line-up — medical-grade sensors, adventure-grade durability.',
    items: [
      {
        Icon: HeartPulse,
        tag: 'Health',
        name: 'ECG, sleep score & hypertension',
        body: 'Electrocardiogram, sleep stages and blood-pressure trend alerts — heart notifications that can start a real conversation with your doctor.',
      },
      {
        Icon: Activity,
        tag: 'Fitness',
        name: 'Every workout, counted',
        body: 'Training Load, running form metrics and calorie estimates that stay honest across cycling, swimming and hikes in the valley.',
      },
      {
        Icon: Compass,
        tag: 'Outdoors',
        name: 'Precision dual-frequency GPS',
        body: 'L1 + L5 satellite tracking pins you to the right trail even between Kathmandu high-rises and narrow gorge paths.',
      },
      {
        Icon: Droplets,
        tag: 'Durability',
        name: 'Built for water and rock',
        body: 'Water resistance to 100m, depth and temperature sensing, with sapphire crystal and titanium on the tough models.',
      },
      {
        Icon: Gauge,
        tag: 'Display',
        name: '3000 nits of always-on',
        body: 'The brightest display on a wearable — legible in direct Himalayan sun, dimmable to a whisper at night.',
      },
      {
        Icon: BatteryCharging,
        tag: 'Battery',
        name: 'Days, not hours',
        body: 'Up to 72 hours in low-power mode, with fast charging squeezing a night of sleep tracking into a morning shower.',
      },
    ],
  },
  specs: {
    eyebrow: 'SPECS',
    title: 'Compare at a glance.',
    description:
      'Live specifications from the catalogue — case size, connectivity, battery and Nepal price for every watch.',
  },
  services: {
    eyebrow: 'KEEP IT GOING',
    title: 'The rest of the story.',
    description:
      'Trade in the old band-and-case, spread the cost across EMI, and keep it covered with authorised repair.',
  },
  faq: {
    eyebrow: 'GOOD TO KNOW',
    title: 'Questions, answered.',
    description: 'The short version of buying an Apple Watch here.',
    items: [
      {
        q: 'Which band size fits my wrist?',
        a: 'Every watch lists its case size and compatible bands. Most bands adjust from roughly 130–220mm wrists; bring your wrist to a store and we will size it properly.',
      },
      {
        q: 'Is cellular worth it in Nepal?',
        a: 'Cellular lets the watch stream music and take calls without your phone — useful for runs and drives. GPS-only works everywhere with your iPhone nearby and costs less.',
      },
      {
        q: 'Is the warranty valid in Nepal?',
        a: 'Yes — official warranty-backed units, with serial and warranty dates saved to your account after purchase and service handled by our authorised repair desk.',
      },
      {
        q: 'Can I trade in my current watch?',
        a: 'Share the model and condition for an instant estimate and apply the credit against your new watch. A specialist confirms the final value on inspection.',
      },
      {
        q: 'How do I know my size is in stock?',
        a: 'Stock is live per configuration and per store — if a case size and band combination shows availability, it can be bought or reserved right away.',
      },
    ],
  },
};

/* ── AirPods ── */
const airpods: CategoryConfig = {
  slug: 'airpods',
  docTitle: 'AirPods in Nepal — Pro, Max & live pricing — iPhoneBooking',
  query: 'category=airpods',
  dimLabels: { storage: 'Style', color: 'Colour' },
  eyebrow: 'AIRPODS · PRO / MAX / 4',
  headline: 'Find your own frequency.',
  intro: (h) =>
    `${h.name} — “${h.tagline}”. Compare models for live pricing, then buy or reserve pickup with official warranty.`,
  lineup: {
    eyebrow: 'THE LINE-UP',
    title: 'Every pair. One place.',
    description:
      'AirPods 4, AirPods Pro and AirPods Max — live stock and Nepal pricing across the range.',
  },
  features: {
    eyebrow: "WHAT'S NEW",
    title: 'Quieter world. Richer sound.',
    description:
      'The story behind the current AirPods line-up — adaptive noise control, spatial audio and hearing health.',
    items: [
      {
        Icon: Volume2,
        tag: 'Noise control',
        name: 'Adaptive ANC & transparency',
        body: 'Active Noise Cancellation folds traffic and cabin roar; Adaptive mode blends the outside world in when you need it.',
      },
      {
        Icon: Sparkles,
        tag: 'Sound',
        name: 'Personalised Spatial Audio',
        body: 'Head-tracked spatial audio with a profile tuned to your ears makes films and music feel staged around you.',
      },
      {
        Icon: HeartPulse,
        tag: 'Health',
        name: 'Heart-rate sensing',
        body: 'Optical sensors on the Pro line count workout heart rate straight from your ears — no watch required.',
      },
      {
        Icon: Bluetooth,
        tag: 'Chip',
        name: 'H-series performance',
        body: 'The H-chip handles voice isolation, seamless device switching and lower latency for games and calls.',
      },
      {
        Icon: ShieldCheck,
        tag: 'Hearing',
        name: 'Hearing health built in',
        body: 'Hearing tests, hearing-aid support and loud-environment protection — clinical-grade care in a pair of earbuds.',
      },
      {
        Icon: BatteryCharging,
        tag: 'Battery',
        name: 'USB-C case, all-day listening',
        body: 'Up to 30 hours with the case, fast charge for a quick blast of playback, and USB-C everywhere.',
      },
    ],
  },
  specs: {
    eyebrow: 'SPECS',
    title: 'Compare at a glance.',
    description:
      'Live specifications from the catalogue — chip, noise control, battery and Nepal price for every pair.',
  },
  services: {
    eyebrow: 'KEEP IT GOING',
    title: 'The rest of the story.',
    description:
      'Protect the pair you wear every day — trade-in credit, authorised repair and compare all one tap away.',
  },
  faq: {
    eyebrow: 'GOOD TO KNOW',
    title: 'Questions, answered.',
    description: 'The short version of buying AirPods here.',
    items: [
      {
        q: 'Are these AirPods genuine for Nepal?',
        a: 'Yes — every pair is an official, warranty-backed unit with a serial you can verify. Your purchase and warranty record are saved to your account.',
      },
      {
        q: 'Can batteries be replaced?',
        a: 'Battery service is available through our repair desk with a quote before any work begins. Out-of-warranty pricing depends on the model and battery health.',
      },
      {
        q: 'Which model is right for me?',
        a: 'AirPods 4 are the everyday open fit, Pro adds the strongest ANC and silicone tips, Max is over-ear with big sound. Compare specs side by side, or ask in store.',
      },
      {
        q: 'Do you deliver and support returns?',
        a: 'Nationwide delivery across Nepal, same-day in Kathmandu where stock allows. Unopened items can be returned within the window on our returns policy.',
      },
    ],
  },
};

/* ── Accessories ── */
const accessories: CategoryConfig = {
  slug: 'accessories',
  docTitle: 'Accessories — MagSafe, power & protection — iPhoneBooking',
  query: 'category=accessories',
  dimLabels: { storage: 'Length', color: 'Colour' },
  eyebrow: 'ACCESSORIES · MAGSAFE & MORE',
  headline: 'The finishing touches.',
  intro: (h) =>
    `${h.name} — “${h.tagline}”. Genuine accessories with live pricing — chargers, cables and protection that just fit.`,
  lineup: {
    eyebrow: 'THE LINE-UP',
    title: 'Everything around the device.',
    description:
      'Chargers, cables, cases and more — live stock and Nepal pricing, all genuine and warrantied.',
  },
  features: {
    eyebrow: "WHAT'S NEW",
    title: 'Magnets, power, protection.',
    description:
      'The details that make the device feel finished — first-party accessories that snap, charge and protect exactly right.',
    items: [
      {
        Icon: Magnet,
        tag: 'MagSafe',
        name: 'Snap into place',
        body: 'Magnetic alignment centres chargers, wallets and mounts perfectly every time — with up to 25W wireless charging.',
      },
      {
        Icon: ShieldCheck,
        tag: 'Protection',
        name: 'Cases that earn their keep',
        body: 'Tight-tolerance cases with magnet arrays and raised edges — protection that does not fight the design.',
      },
      {
        Icon: Zap,
        tag: 'Power',
        name: 'Cables, adapters, USB-C',
        body: 'Braided USB-C cables, compact adapters and dual-port bricks — one charging kit for phone, watch and Mac.',
      },
      {
        Icon: Keyboard,
        tag: 'Productivity',
        name: 'Keys & pointers',
        body: 'Magic Keyboard and Magic Trackpad turn iPad and Mac into a clean, cable-light desk.',
      },
      {
        Icon: Sparkles,
        tag: 'Finishes',
        name: 'Colour, matched',
        body: 'Accessories finished in the same seasonal colours as the devices they belong to — the set looks like a set.',
      },
      {
        Icon: BadgeCheck,
        tag: 'Trust',
        name: 'Genuine & warrantied',
        body: 'Every accessory is an official unit with its own warranty record — no grey-market surprises at the till.',
      },
    ],
  },
  specs: {
    eyebrow: 'SPECS',
    title: 'Compare at a glance.',
    description:
      'Live specifications from the catalogue — compatibility, power and Nepal price for every accessory.',
  },
  services: {
    eyebrow: 'KEEP IT GOING',
    title: 'The rest of the story.',
    description:
      'Bundle accessories with a trade-in, protect the whole kit with repair cover, and compare before you commit.',
  },
  faq: {
    eyebrow: 'GOOD TO KNOW',
    title: 'Questions, answered.',
    description: 'The short version of buying accessories here.',
    items: [
      {
        q: 'Will this work with my device?',
        a: 'Each accessory lists the devices it supports. If in doubt, match the connector and model — or message us with your device and we will confirm before you buy.',
      },
      {
        q: 'Are these genuine Apple accessories?',
        a: 'Yes — official units with warranty records saved to your account, alongside a curated selection of quality third-party options clearly labelled as such.',
      },
      {
        q: 'Can I return an accessory?',
        a: 'Unopened accessories can be returned within the window on our returns policy. Defective items are covered by warranty and handled through the repair desk.',
      },
      {
        q: 'How fast do accessories arrive?',
        a: 'Same-day delivery in Kathmandu where stock allows, nationwide courier across Nepal everywhere else.',
      },
    ],
  },
};

/* ── Store (whole catalogue) ── */
const store: CategoryConfig = {
  slug: 'store',
  docTitle: 'Store — every device, live Nepal pricing — iPhoneBooking',
  query: null,
  eyebrow: 'THE IPHONEBOOKING STORE',
  headline: 'Your next great thing.',
  intro: (h) =>
    `Every device under one roof — starting with ${h.name}, “${h.tagline}”. Live stock, Nepal pricing, EMI and trade-in across the whole catalogue.`,
  lineup: {
    eyebrow: 'THE WHOLE FLOOR',
    title: 'Everything, in stock.',
    description:
      'iPhone, Mac, iPad, Watch, AirPods and accessories — live stock and pricing straight from the catalogue.',
  },
  features: {
    eyebrow: 'WHY IPHONEBOOKING',
    title: 'The whole experience. One place.',
    description:
      'Buying Apple in Nepal should feel effortless — genuine stock, fair pricing and support that stays after the sale.',
    items: [
      {
        Icon: BadgeCheck,
        tag: 'Trust',
        name: 'Genuine, warranty-backed',
        body: 'Official units with an IMEI or serial you can check before you buy — warranty dates stored in your account.',
      },
      {
        Icon: CreditCard,
        tag: 'Payments',
        name: 'EMI & every way to pay',
        body: 'Khalti, eSewa, cards, bank transfer and cash on delivery — with EMI plans shown in full before you confirm.',
      },
      {
        Icon: Truck,
        tag: 'Delivery',
        name: 'Delivery across Nepal',
        body: 'Same-day in Kathmandu where stock allows, nationwide courier everywhere else, international shipping on request.',
      },
      {
        Icon: Store,
        tag: 'Pickup',
        name: 'Reserve, pick up in store',
        body: 'Reserve any in-stock configuration and collect it from our Kathmandu studio — no queue, no waiting.',
      },
      {
        Icon: RefreshCw,
        tag: 'Trade-in',
        name: 'Value from your old device',
        body: 'Instant estimates on your current phone, laptop or tablet, applied as credit against whatever comes next.',
      },
      {
        Icon: Wrench,
        tag: 'Service',
        name: 'Repair that keeps you going',
        body: 'Book a repair, approve the quote and follow the work live — genuine parts and warranted labour.',
      },
    ],
  },
  specs: {
    eyebrow: 'SPECS',
    title: 'Compare at a glance.',
    description:
      'Live specifications from the catalogue. Add two or more models for a full side-by-side.',
  },
  services: {
    eyebrow: 'KEEP IT GOING',
    title: 'The rest of the story.',
    description:
      'Upgrade, protect and repair — trade-in credit, authorised service and side-by-side compare, one tap away.',
  },
  faq: {
    eyebrow: 'GOOD TO KNOW',
    title: 'Questions, answered.',
    description: 'Payments, delivery and everything else before you tap buy.',
    items: [
      {
        q: 'How can I pay?',
        a: 'Khalti, eSewa, cards, bank transfer and cash on delivery — plus EMI plans from card issuers and bank partners at checkout, with the total shown before you confirm.',
      },
      {
        q: 'How fast is delivery?',
        a: 'Same-day in Kathmandu where stock allows, nationwide courier across Nepal otherwise, and international shipping on request. Every order is tracked from your account.',
      },
      {
        q: 'How do I know a listing is genuine?',
        a: 'Every device is an official, warranty-backed unit with an IMEI or serial you can check before you buy. Your purchase and warranty record are stored in your account.',
      },
      {
        q: 'Can I pick up in store instead?',
        a: 'Yes — reserve any in-stock configuration and choose store pickup at checkout. We will hold it for you at the Kathmandu studio.',
      },
      {
        q: 'What if I change my mind?',
        a: 'Unopened items can be returned within the window on our returns policy, and anything faulty is covered by warranty through the repair desk.',
      },
    ],
  },
  chips: [
    { label: 'iPhone', to: '/iphone' },
    { label: 'Mac', to: '/mac' },
    { label: 'iPad', to: '/ipad' },
    { label: 'Watch', to: '/watch' },
    { label: 'AirPods', to: '/airpods' },
    { label: 'Accessories', to: '/accessories' },
    { label: 'Vision', to: '/vision' },
    { label: 'Home', to: '/home' },
  ],
};

export const CONFIGS = { store, iphone, mac, ipad, watch, airpods, accessories } as const;
export type CategorySlug = keyof typeof CONFIGS;
