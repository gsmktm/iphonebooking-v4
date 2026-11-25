import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../server/db.js';
if (process.env.NODE_ENV === 'production' || process.env.SEED_DEVELOPMENT !== 'true')
  throw new Error('Development seeding is disabled. Use an explicit non-production database.');
const categories = [
  ['iphone', 'iPhone', 'A little more extraordinary.', 'phone'],
  ['mac', 'Mac', 'Make room for your big ideas.', 'mac'],
  ['ipad', 'iPad', 'Your ideas. Unbound.', 'ipad'],
  ['watch', 'Apple Watch', 'A healthier connection.', 'watch'],
  ['airpods', 'AirPods', 'Find your own frequency.', 'airpods'],
  ['vision', 'Apple Vision', 'A new perspective.', 'vision'],
  ['home', 'TV & Home', 'Make yourself at home.', 'home'],
  ['accessories', 'Accessories', 'Better, together.', 'accessories'],
];
for (const [slug, name, description, image] of categories)
  await db.category.upsert({
    where: { slug },
    update: {},
    create: { slug, name, description, image },
  });
const store = await db.store.upsert({
  where: { slug: 'kathmandu-studio' },
  update: {},
  create: {
    slug: 'kathmandu-studio',
    name: 'Kathmandu Studio · Development',
    address: 'Kathmandu, Bagmati, Nepal — sample location',
    hours: 'Appointment only. Store details pending verification.',
    phone: 'Not configured',
    services: ['Pickup', 'Trade-in inspection', 'Repair consultation'],
  },
});
type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  image: string;
  price: number;
  badge: string | null;
  specs: Record<string, string>;
  colors: string[][];
  storage: string[];
  preorder?: boolean;
};
const products: SeedProduct[] = [
  {
    slug: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    category: 'iphone',
    tagline: 'A remarkable point of view.',
    image: 'phone',
    price: 168700,
    badge: 'Featured',
    specs: {
      Display: '6.3-inch Super Retina XDR',
      Chip: 'A18 Pro',
      Camera: '48MP Fusion',
      Storage: '128GB–512GB',
      Connectivity: '5G · Wi-Fi 7',
      Material: 'Titanium',
    },
    colors: [
      ['Desert Titanium', '#bba58d'],
      ['Natural Titanium', '#aaa69f'],
      ['Black Titanium', '#434342'],
    ],
    storage: ['128GB', '256GB', '512GB'],
  },
  {
    slug: 'macbook-air',
    name: 'MacBook Air',
    category: 'mac',
    tagline: 'Light on weight. Heavy on possibility.',
    image: 'mac',
    price: 149900,
    badge: 'Popular',
    specs: {
      Display: '13.6-inch Liquid Retina',
      Chip: 'M4',
      Memory: '16GB',
      Storage: '256GB–512GB',
      Connectivity: 'Wi-Fi 6E',
      Material: 'Aluminum',
    },
    colors: [
      ['Midnight', '#373e49'],
      ['Silver', '#c9cbcd'],
    ],
    storage: ['256GB', '512GB'],
  },
  {
    slug: 'ipad-air',
    name: 'iPad Air',
    category: 'ipad',
    tagline: 'Your next big idea starts here.',
    image: 'ipad',
    price: 99900,
    badge: null,
    specs: {
      Display: '11-inch Liquid Retina',
      Chip: 'M3',
      Camera: '12MP',
      Storage: '128GB–256GB',
      Connectivity: 'Wi-Fi',
      Material: 'Aluminum',
    },
    colors: [
      ['Blue', '#a7b9cf'],
      ['Space Gray', '#7e8086'],
    ],
    storage: ['128GB', '256GB'],
  },
  {
    slug: 'apple-watch-series-10',
    name: 'Apple Watch Series 10',
    category: 'watch',
    tagline: 'Every day. A little better.',
    image: 'watch',
    price: 64900,
    badge: null,
    specs: {
      Display: '42mm OLED',
      Chip: 'S10',
      Battery: 'Up to 18 hours',
      Connectivity: 'GPS',
      Material: 'Aluminum',
    },
    colors: [
      ['Jet Black', '#2f3032'],
      ['Silver', '#c9cbcd'],
    ],
    storage: ['42mm', '46mm'],
  },
  {
    slug: 'airpods-4',
    name: 'AirPods 4',
    category: 'airpods',
    tagline: 'Sound that stays with you.',
    image: 'airpods',
    price: 24900,
    badge: 'Everyday essential',
    specs: {
      Audio: 'Personalized Spatial Audio',
      Chip: 'H2',
      Battery: 'Up to 30 hours with case',
      Connectivity: 'Bluetooth 5.3',
      Charging: 'USB-C',
    },
    colors: [['White', '#e9e9e7']],
    storage: ['Standard', 'ANC'],
  },
  {
    slug: 'apple-vision-pro',
    name: 'Apple Vision Pro',
    category: 'vision',
    tagline: 'A whole new perspective.',
    image: 'vision',
    price: 599900,
    badge: 'By reservation',
    specs: {
      Display: 'Micro-OLED',
      Chip: 'M2 + R1',
      Storage: '256GB',
      Connectivity: 'Wi-Fi 6',
      Material: 'Aluminum & glass',
    },
    colors: [['Silver', '#c9cbcd']],
    storage: ['256GB'],
  },
  {
    slug: 'homepod-mini',
    name: 'HomePod mini',
    category: 'home',
    tagline: 'Small speaker. Big atmosphere.',
    image: 'home',
    price: 18900,
    badge: null,
    specs: {
      Audio: '360-degree sound',
      Chip: 'S5',
      Connectivity: 'Wi-Fi · Bluetooth',
      Size: '84.3 mm tall',
    },
    colors: [['Midnight', '#373e49']],
    storage: ['Standard'],
  },
  {
    slug: 'magsafe-charger',
    name: 'MagSafe Charger',
    category: 'accessories',
    tagline: 'A magnetic connection.',
    image: 'accessories',
    price: 7900,
    badge: null,
    specs: { Compatibility: 'MagSafe-enabled iPhone', Connector: 'USB-C', Cable: '1 meter' },
    colors: [['White', '#e9e9e7']],
    storage: ['1m'],
  },
];
for (const p of products) {
  const category = await db.category.findUniqueOrThrow({ where: { slug: p.category } });
  const product = await db.product.upsert({
    where: { slug: p.slug },
    update: {},
    create: {
      slug: p.slug,
      name: p.name,
      categoryId: category.id,
      tagline: p.tagline,
      description: `${p.tagline} Discover thoughtful design and everyday capability with ${p.name}. Explore your configuration below. This development catalog is for testing; commercial details must be reviewed before launch.`,
      image: p.image,
      gallery: [p.image],
      specs: p.specs,
      badge: p.badge,
      featured: ['iphone', 'mac', 'ipad', 'airpods'].includes(p.category),
    },
  });
  for (const [ci, [color, colorHex]] of p.colors.entries())
    for (const [si, storage] of p.storage.entries()) {
      const sku = `${p.slug}-${ci}-${si}`;
      const price = (p.price + si * (p.category === 'iphone' ? 20000 : 10000)) * 100;
      const variant = await db.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          sku,
          color,
          colorHex,
          storage,
          price,
          deposit: Math.min(price, 1000000),
          preorder: p.preorder ?? p.category === 'vision',
        },
      });
      const existing = await db.inventoryStock.findUnique({
        where: { variantId_storeId: { variantId: variant.id, storeId: store.id } },
      });
      if (!existing) {
        const stock = await db.inventoryStock.create({
          data: { variantId: variant.id, storeId: store.id, available: 8 },
        });
        await db.inventoryLedger.create({
          data: { stockId: stock.id, type: 'DEVELOPMENT_SEED', quantity: 8, reference: 'seed-v2' },
        });
      }
    }
}
for (const [model, baseValue] of [
  ['iPhone 16 Pro', 10000000],
  ['iPhone 15 Pro', 8500000],
  ['iPhone 14 Pro', 6500000],
  ['iPhone 13', 3800000],
  ['MacBook Air', 8000000],
] as const)
  await db.tradeInRule.upsert({ where: { model }, update: {}, create: { model, baseValue } });
const pages = [
  {
    slug: 'home',
    title: 'Book the Future.',
    description: 'Discover, upgrade, and care for the devices you love.',
    blocks: [
      {
        type: 'hero',
        title: 'Book the Future.',
        body: 'Discover, compare, and pre-book Apple devices. Trade in, book a repair, and follow every step — in one place.',
        href: '/prebook',
      },
    ],
  },
  ...[
    [
      'support-booking',
      'How reservations work',
      'Reserve your configuration online for 24 hours. Visit the store to complete payment. No money is collected online while payment providers are unconfigured.',
    ],
    [
      'support-delivery',
      'Delivery & pickup',
      'Choose pickup or provide your Nepal delivery address at checkout. Availability and delivery timing will be confirmed by the store.',
    ],
    [
      'support-repair',
      'A little care goes a long way',
      'Submit a repair request from your account. We diagnose your device and send a quote for your approval before starting work.',
    ],
    [
      'support-trade-in',
      'A new chapter for your device',
      'Online estimates are indicative. A physical inspection determines the final value. You decide whether to accept the offer.',
    ],
    [
      'privacy',
      'Privacy policy — draft',
      'This policy requires business and legal review before public launch. The application stores account and transaction data to provide commerce and service workflows.',
    ],
    [
      'terms',
      'Terms of service — draft',
      'These terms require business and legal review before public launch. Development data does not represent a commercial offer.',
    ],
    [
      'returns',
      'Returns & refunds — draft',
      'Contact support through your account to discuss a return. Refunds require staff review. This draft policy must be approved before launch.',
    ],
    [
      'warranty',
      'Warranty — draft',
      'Warranty eligibility depends on the product, its source and the terms on your invoice. Confirm coverage with the store before purchasing.',
    ],
    [
      'repair-terms',
      'Repair terms — draft',
      'A quotation must be approved before work begins. Warranty and completion estimates are defined in the individual quotation.',
    ],
    [
      'trade-in-terms',
      'Trade-in terms — draft',
      'Estimates are subject to physical inspection. Ownership and eligibility must be checked before acceptance.',
    ],
    [
      'prebooking-terms',
      'Pre-booking terms — draft',
      'Reservations expire after 24 hours if unpaid. Final allocation and availability must be confirmed by staff.',
    ],
  ].map(([slug, title, body]) => ({
    slug,
    title,
    description: body,
    blocks: [{ type: 'text', title, body }],
  })),
];
for (const page of pages)
  await db.cMSPage.upsert({
    where: { slug: page.slug },
    update: {},
    create: { ...page, published: true },
  });
const roles = [
  ['Super Admin', ['*']],
  ['Content Manager', ['content.read', 'content.update', 'product.read']],
  ['Technician', ['repair.read', 'repair.update']],
  [
    'Repair Manager',
    ['repair.read', 'repair.update', 'repair.assign', 'inventory.read', 'device.read'],
  ],
  [
    'Quality Inspector',
    ['repair.read', 'repair.qc', 'inventory.read', 'inventory.qc', 'device.read'],
  ],
  [
    'Procurement Officer',
    [
      'procurement.read',
      'procurement.create',
      'inventory.read',
      'inventory.receive',
      'product.read',
      'store.read',
    ],
  ],
  ['Procurement Approver', ['procurement.read', 'procurement.approve', 'inventory.read']],
  ['Finance', ['payment.view', 'payment.collect', 'order.read', 'report.read']],
  ['Inventory Manager', ['inventory.read', 'inventory.adjust', 'product.read']],
] as const;
for (const [name, permissions] of roles)
  await db.role.upsert({
    where: { name },
    update: {},
    create: { name, permissions: [...permissions] },
  });
if (process.env.ADMIN_PASSWORD) {
  const role = await db.role.findUniqueOrThrow({ where: { name: 'Super Admin' } });
  await db.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? 'admin@iphonebooking.local' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL ?? 'admin@iphonebooking.local',
      name: 'Store administrator',
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      roleId: role.id,
    },
  });
}
console.log('Development catalog seeded. No customer orders or dashboard metrics were fabricated.');
await db.$disconnect();
