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
  eyebrow: 'IPHONE · THE CURRENT CATALOG',
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
    title: 'A closer look at your next device.',
    description:
      'Compare the specifications published in the current catalog, alongside configuration prices in Nepal.',
    items: [
      {
        Icon: Cpu,
        tag: 'Performance',
        name: 'Performance for your day',
        body: 'Compare the chip specifications for your chosen model in the catalog.',
      },
      {
        Icon: Camera,
        tag: 'Camera',
        name: 'A closer look at the camera',
        body: 'Camera capabilities depend on the model. Check the published specifications before choosing.',
      },
      {
        Icon: ShieldCheck,
        tag: 'Durability',
        name: 'Materials that matter',
        body: 'Review the materials and care information for your chosen model.',
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
        body: 'Feature availability varies by device, software, language and region. Confirm the features you need before purchase.',
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
        a: 'Check the seller, device identifiers, warranty terms and invoice for each listed iPhone before purchase. An Apple.com model reference is not proof of genuine local stock.',
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
        a: 'EMI is available only if a participating bank or payment partner explicitly offers it at checkout. Do not assume instalment approval.',
      },
      {
        q: 'Can I trade in my old laptop?',
        a: 'Submit the device details for an estimate. Final trade-in value and any pickup service must be confirmed after inspection.',
      },
      {
        q: 'Is AppleCare+ available for Mac?',
        a: 'AppleCare+ eligibility and regional service coverage depend on the exact device and local terms. Check Apple's coverage information before paying.',
      },
      {
        q: 'Where do you deliver?',
        a: 'Delivery coverage, timing and fees depend on verified stock, the delivery address and a confirmed carrier quote.',
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
        a: 'EMI must be confirmed by a participating bank or payment partner at checkout before it is offered.',
      },
      {
        q: 'Can I trade in my old tablet?',
        a: 'Share the model, storage and condition for an instant estimate, then apply the credit against your new iPad. A specialist confirms the final value on inspection.',
      },
      {
        q: 'Is the warranty valid in Nepal?',
        a: 'Before purchase, verify the model, serial, seller invoice and the specific Nepal warranty and service terms.',
      },
      {
        q: 'Do you deliver outside Kathmandu?',
        a: 'Delivery depends on verified stock and confirmed coverage for the destination. Ask for the total and expected date before payment.',
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
        a: 'Check the serial, original invoice and warranty eligibility for each listed watch. We do not claim Apple-authorised service status without evidence.',
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
        a: 'Verify the product serial, seller invoice and warranty coverage for the specific pair before buying.',
      },
      {
        q: 'Can batteries be replaced?',
        a: 'Battery service is available through our repair desk with a quote before any work begins. Out-of-warranty pricing depends on the model and battery health.',
      },
      {
        q: 'Which model is right for me?',
        a: 'Compare the currently listed AirPods models and their features on Apple.com, then check which models are actually available in our Nepal catalog.',
      },
      {
        q: 'Do you deliver and support returns?',
        a: 'Delivery and return eligibility must be confirmed against the store's published policy and your order details.',
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
    `${h.name} — “${h.tagline}”. Browse chargers, cables and protection with verified compatibility and locally published prices when available.`,
  lineup: {
    eyebrow: 'THE LINE-UP',
    title: 'Everything around the device.',
    description:
      'Chargers, cables and cases — verify compatibility, seller warranty terms and local inventory for each listing.',
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
        name: 'Check authenticity',
        body: 'Check the brand, compatibility and warranty on the individual listing. Third-party accessories are identified separately.',
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
        a: 'Apple-branded accessories and third-party accessories must be clearly identified on each listing. Verify the seller invoice and warranty before purchase.',
      },
      {
        q: 'Can I return an accessory?',
        a: 'Unopened accessories can be returned within the window on our returns policy. Defective items are covered by warranty and handled through the repair desk.',
      },
      {
        q: 'How fast do accessories arrive?',
        a: 'Delivery times and regions are confirmed against stock and carrier availability before an order is accepted.',
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
    `Every device under one roof — starting with ${h.name}, “${h.tagline}”. Browse actual catalog prices, confirmed stock, and service options as they become available.`,
  lineup: {
    eyebrow: 'THE WHOLE FLOOR',
    title: 'Your local catalog.',
    description:
      'iPhone, Mac, iPad, Watch, AirPods and accessories — live stock and pricing straight from the catalogue.',
  },
  features: {
    eyebrow: 'WHY IPHONEBOOKING',
    title: 'The whole experience. One place.',
    description:
      'Explore Apple devices with transparent sources, actual merchant inventory and clearly stated service terms.',
    items: [
      {
        Icon: BadgeCheck,
        tag: 'Trust',
        name: 'Check before purchase',
        body: 'Verify the serial or IMEI where applicable, invoice and warranty coverage for each individual device.',
      },
      {
        Icon: CreditCard,
        tag: 'Payments',
        name: 'Verified payment methods',
        body: 'Only methods enabled at checkout are currently available. Online gateway and EMI options are not implied until configured.',
      },
      {
        Icon: Truck,
        tag: 'Delivery',
        name: 'Delivery across Nepal',
        body: 'Delivery availability and timing are confirmed after the merchant verifies stock and carrier service.',
      },
      {
        Icon: Store,
        tag: 'Pickup',
        name: 'Reserve, pick up in store',
        body: 'Store pickup applies only to confirmed stock and a verified collection location and appointment.',
      },
      {
        Icon: RefreshCw,
        tag: 'Trade-in',
        name: 'Value from your old device',
        body: 'Submit a trade-in valuation request; final credit is subject to documented inspection and approval.',
      },
      {
        Icon: Wrench,
        tag: 'Service',
        name: 'Repair that keeps you going',
        body: 'Book a repair and approve the itemised quote; parts provenance and warranty terms must be recorded per job.',
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
      'Compare devices and request trade-in or repair services with clear terms and documented status.',
  },
  faq: {
    eyebrow: 'GOOD TO KNOW',
    title: 'Questions, answered.',
    description: 'Payments, delivery and everything else before you tap buy.',
    items: [
      {
        q: 'How can I pay?',
        a: 'Only payment methods currently enabled in checkout can be used. Online gateways and EMI are subject to partner activation.',
      },
      {
        q: 'How fast is delivery?',
        a: 'Shipping dates and coverage depend on stock, carrier service and your confirmed order; available tracking is shown in your account.',
      },
      {
        q: 'How do I know a listing is genuine?',
        a: 'Check the specific item's IMEI or serial (where applicable), invoice and warranty terms. Apple.com references do not prove merchant authorization or stock.',
      },
      {
        q: 'Can I pick up in store instead?',
        a: 'Pickup is possible only when checkout offers a verified location and the merchant confirms the item is reserved.',
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
