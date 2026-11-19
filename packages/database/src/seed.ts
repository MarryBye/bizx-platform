/**
 * ============================================================================
 * BizX Platform — Database Seed Script
 * ============================================================================
 * Пароль для ВСІХ тестових акаунтів: password123
 *
 * 1. КОМАНДА ПЛАТФОРМИ BIZX (вхід у BizX Core Admin):
 * ────────────────────────────────────────────────────────────────────────────
 * • admin@bizx.ua           | +380501234567 | Власник платформи (priority 10000, isOwner)
 * • ops.bizx@bizx.ua        | +380502223344 | Операційний менеджер (priority 500, керує закладами/ролями/командою < 500, без *.archive)
 * • support.bizx@bizx.ua    | +380503334455 | Підтримка (priority 100, лише перегляд закладів/користувачів/аналітики)
 * • analyst.bizx@bizx.ua    | +380504445566 | Custom (лише аналітика, експорт та перегляд закладів)
 *
 * 2. ВЛАСНИКИ БІЗНЕСІВ (вхід у BizX Business Admin та Landing):
 * ────────────────────────────────────────────────────────────────────────────
 * • owner.coffee@bizx.ua    | +380671112233 | Власник «Львівська Кавова Мануфактура» (business_pro, до 3 закладів)
 * • owner.tech@bizx.ua      | +380934445566 | Власниця «CyberTech Ukraine» (business_starter, до 1 закладу)
 * • owner.bakery@bizx.ua    | +380667778899 | Власник «Хлібна Майстерня» (business_starter, до 1 закладу)
 *
 * 3. ПРАЦІВНИКИ БІЗНЕСІВ (без власної підписки, доступ лише до свого бізнесу):
 * ────────────────────────────────────────────────────────────────────────────
 * [Львівська Кавова Мануфактура]
 * • manager.coffee@bizx.ua  | +380672223301 | Керуючий (priority 500, 1 галочка store.admin — повний доступ крім ownerOnly)
 * • barista.coffee@bizx.ua  | +380672223302 | Старший бариста (priority 300, products.read/write + orders.read/edit)
 * • cashier.coffee@bizx.ua  | +380672223303 | Персонал (priority 100, products.read + orders.read/edit, БЕЗ store.read)
 * • analyst.coffee@bizx.ua  | +380672223304 | Custom (analytics.read, analytics.export, orders.read)
 *
 * [CyberTech Ukraine]
 * • manager.tech@bizx.ua    | +380935556601 | Керуючий (priority 500, явні права БЕЗ store.admin та *.archive команди/ролей)
 * • content.tech@bizx.ua    | +380935556602 | Контент-менеджер (priority 250, товари read/write/edit/status, БЕЗ archive)
 * • sales.tech@bizx.ua      | +380935556603 | Персонал (priority 100, замовлення + перегляд товарів, БЕЗ store.read)
 *
 * [Хлібна Майстерня]
 * • manager.bakery@bizx.ua  | +380668889901 | Керуючий (priority 500, повні явні права)
 * • baker.bakery@bizx.ua    | +380668889902 | Пекар-технолог (priority 250, товари read/write/edit без status/archive + orders.read)
 * • courier.bakery@bizx.ua  | +380668889903 | Custom (orders.read, orders.edit — без store.read і без товарів)
 *
 * 4. ЗВИЧАЙНІ КОРИСТУВАЧІ (без підписок, без бізнесів, без адмін-доступів):
 *    Зручно використовувати для тестування додавання працівників по Email/Телефону
 *    та як реальних покупців в історії замовлень.
 * ────────────────────────────────────────────────────────────────────────────
 * • client@bizx.ua          | +380991239876 | Марія Бондаренко (free, client)
 * • user1@bizx.ua           | +380991110001 | Іван Ковальчук (free, client)
 * • user2@bizx.ua           | +380991110002 | Ольга Савчук (free, client)
 * • user3@bizx.ua           | +380991110003 | Денис Марченко (free, client)
 * • user4@bizx.ua           | +380991110004 | Анастасія Павленко (free, client)
 * • user5@bizx.ua           | +380991110005 | Павло Тимошенко (free, client)
 * • user6@bizx.ua           | +380991110006 | Дарина Климчук (free, client)
 * • user7@bizx.ua           | +380991110007 | Сергій Гриценко (free, client)
 * • user8@bizx.ua           | +380991110008 | Тетяна Олійник (free, client)
 * • user9@bizx.ua           | +380991110009 | Євгеній Білоус (free, client)
 * • user10@bizx.ua          | +380991110010 | Христина Василенко (free, client)
 * ============================================================================
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';
import { sql } from 'drizzle-orm';

const OWNER_ROLE_PRIORITY = 10000;

const STORE_PERMISSIONS = [
  { id: 100, code: 'store.admin', scope: 'store', category: 'admin', action: 'manage', ownerOnly: false },
  { id: 101, code: 'products.read', scope: 'store', category: 'products', action: 'read', ownerOnly: false },
  { id: 102, code: 'products.write', scope: 'store', category: 'products', action: 'write', ownerOnly: false },
  { id: 103, code: 'products.edit', scope: 'store', category: 'products', action: 'edit', ownerOnly: false },
  { id: 104, code: 'products.status', scope: 'store', category: 'products', action: 'manage', ownerOnly: false },
  { id: 105, code: 'products.archive', scope: 'store', category: 'products', action: 'archive', ownerOnly: false },
  { id: 111, code: 'orders.read', scope: 'store', category: 'orders', action: 'read', ownerOnly: false },
  { id: 112, code: 'orders.edit', scope: 'store', category: 'orders', action: 'edit', ownerOnly: false },
  { id: 121, code: 'analytics.read', scope: 'store', category: 'analytics', action: 'read', ownerOnly: false },
  { id: 122, code: 'analytics.export', scope: 'store', category: 'analytics', action: 'export', ownerOnly: false },
  { id: 131, code: 'store.read', scope: 'store', category: 'store', action: 'read', ownerOnly: false },
  { id: 132, code: 'store.edit', scope: 'store', category: 'store', action: 'edit', ownerOnly: false },
  { id: 133, code: 'store.status.manage', scope: 'store', category: 'store', action: 'manage', ownerOnly: true },
  { id: 141, code: 'staff.read', scope: 'store', category: 'staff', action: 'read', ownerOnly: false },
  { id: 142, code: 'staff.write', scope: 'store', category: 'staff', action: 'write', ownerOnly: false },
  { id: 143, code: 'staff.edit', scope: 'store', category: 'staff', action: 'edit', ownerOnly: false },
  { id: 144, code: 'staff.archive', scope: 'store', category: 'staff', action: 'archive', ownerOnly: false },
  { id: 151, code: 'roles.read', scope: 'store', category: 'roles', action: 'read', ownerOnly: false },
  { id: 152, code: 'roles.write', scope: 'store', category: 'roles', action: 'write', ownerOnly: false },
  { id: 153, code: 'roles.edit', scope: 'store', category: 'roles', action: 'edit', ownerOnly: false },
  { id: 154, code: 'roles.archive', scope: 'store', category: 'roles', action: 'archive', ownerOnly: false }
];

const PLATFORM_PERMISSIONS = [
  { id: 200, code: 'platform.admin', scope: 'platform', category: 'platform_admin', action: 'manage', ownerOnly: false },
  { id: 201, code: 'platform.stores.read', scope: 'platform', category: 'platform_stores', action: 'read', ownerOnly: false },
  { id: 202, code: 'platform.stores.moderate', scope: 'platform', category: 'platform_stores', action: 'manage', ownerOnly: false },
  { id: 203, code: 'platform.categories.manage', scope: 'platform', category: 'platform_stores', action: 'edit', ownerOnly: false },
  { id: 204, code: 'platform.stores.archive', scope: 'platform', category: 'platform_stores', action: 'archive', ownerOnly: false },
  { id: 211, code: 'platform.users.read', scope: 'platform', category: 'platform_users', action: 'read', ownerOnly: false },
  { id: 212, code: 'platform.users.edit', scope: 'platform', category: 'platform_users', action: 'edit', ownerOnly: false },
  { id: 213, code: 'platform.users.archive', scope: 'platform', category: 'platform_users', action: 'archive', ownerOnly: false },
  { id: 221, code: 'platform.analytics.read', scope: 'platform', category: 'platform_analytics', action: 'read', ownerOnly: false },
  { id: 222, code: 'platform.analytics.export', scope: 'platform', category: 'platform_analytics', action: 'export', ownerOnly: false },
  { id: 231, code: 'platform.staff.read', scope: 'platform', category: 'platform_staff', action: 'read', ownerOnly: false },
  { id: 232, code: 'platform.staff.write', scope: 'platform', category: 'platform_staff', action: 'write', ownerOnly: false },
  { id: 233, code: 'platform.staff.edit', scope: 'platform', category: 'platform_staff', action: 'edit', ownerOnly: false },
  { id: 234, code: 'platform.staff.archive', scope: 'platform', category: 'platform_staff', action: 'archive', ownerOnly: false },
  { id: 241, code: 'platform.roles.read', scope: 'platform', category: 'platform_roles', action: 'read', ownerOnly: false },
  { id: 242, code: 'platform.roles.write', scope: 'platform', category: 'platform_roles', action: 'write', ownerOnly: false },
  { id: 243, code: 'platform.roles.edit', scope: 'platform', category: 'platform_roles', action: 'edit', ownerOnly: false },
  { id: 244, code: 'platform.roles.archive', scope: 'platform', category: 'platform_roles', action: 'archive', ownerOnly: false }
];

const ALL_PERMISSIONS = [...STORE_PERMISSIONS, ...PLATFORM_PERMISSIONS];

// Завантажуємо змінні оточення
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bizx_db';

const queryClient = postgres(connectionString, { max: 5 });
const db = drizzle(queryClient, { schema });

// bcrypt хэш для тестового пароля: "password123"
const PASSWORD_HASH = '$2b$10$HPDJ8QBCeeaHqSugqyYmee0NR1Ab3dWqnsUY7mBdVyWJUe4cimoei';

// Детермінований генератор псевдовипадкових чисел для відтворюваної історії замовлень
function createRng(seedValue: number) {
  let state = seedValue >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

// Функція завантаження файлу у Cloudflare R2
async function uploadToR2(
  s3Client: unknown,
  PutCmd: unknown,
  bucket: string,
  key: string,
  content: string | Buffer,
  contentType: string
): Promise<string> {
  const S3 = s3Client as { send: (cmd: unknown) => Promise<unknown> };
  const CommandClass = PutCmd as new (args: unknown) => unknown;

  await S3.send(
    new CommandClass({
      Bucket: bucket,
      Key: key,
      Body: typeof content === 'string' ? Buffer.from(content) : content,
      ContentType: contentType
    })
  );

  return `/storage/file/${key}`;
}

async function seed() {
  console.info('🌱 Початок наповнення бази даних розширеними тестовими даними (seeds)...');

  try {
    // 0. Ініціалізація Cloudflare R2
    console.info('☁️ Підключення до Cloudflare R2...');
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'bizx-assets';

    let s3Client: unknown = null;
    let PutCmd: unknown = null;

    if (accountId && accessKeyId && secretAccessKey) {
      try {
        const { createRequire } = await import('module');
        const apiRequire = createRequire(
          path.resolve(process.cwd(), '../../apps/api/package.json')
        );
        const { S3Client, PutObjectCommand } = apiRequire('@aws-sdk/client-s3');

        s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey }
        });
        PutCmd = PutObjectCommand;
        console.info(`✅ Cloudflare R2 підключено до бакету: ${bucketName}`);
      } catch (err) {
        console.warn('⚠️ Не вдалося ініціалізувати S3Client:', err);
      }
    }

    // 1. Очищуємо таблиці перед заповненням (ідемпотентність)
    console.info('🧹 Очищення існуючих тестових даних...');
    await db.execute(sql`
      TRUNCATE TABLE 
        order_items,
        orders,
        products,
        product_categories,
        store_member_permissions,
        store_members,
        platform_member_permissions,
        platform_members,
        role_permissions,
        roles,
        permissions,
        stores,
        store_categories,
        refresh_tokens,
        users
      CASCADE;
    `);

    // 1b. Довідник прав доступу (RBAC Permissions)
    console.info(`🔐 Наповнення довідника прав доступу (${ALL_PERMISSIONS.length} permissions)...`);
    await db.insert(schema.permissions).values(ALL_PERMISSIONS).onConflictDoNothing();
    const permByCode = new Map(ALL_PERMISSIONS.map((p) => [p.code, p.id]));

    // 2. Медіафайли в R2 (паралельне завантаження)
    console.info('📤 Завантаження медіафайлів у Cloudflare R2...');

    const avatarSvg = (name: string, bg: string) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
        <circle cx="64" cy="64" r="64" fill="${bg}"/>
        <circle cx="64" cy="50" r="22" fill="#ffffff" opacity="0.95"/>
        <path d="M64 78 C42 78 24 94 24 116 C35 124 50 128 64 128 C78 128 93 124 104 116 C104 94 86 78 64 78 Z" fill="#ffffff" opacity="0.95"/>
        <text x="64" y="122" font-family="sans-serif" font-size="11" fill="#ffffff" text-anchor="middle" font-weight="bold">${name}</text>
      </svg>
    `;

    const storeSvg = (title: string, color: string) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
        <rect width="128" height="128" rx="28" fill="${color}"/>
        <path d="M28 44 L64 24 L100 44 L100 52 L28 52 Z M34 58 L34 98 L94 98 L94 58 Z M50 98 L50 74 L78 74 L78 98 Z" fill="#ffffff" opacity="0.95"/>
        <text x="64" y="116" font-family="sans-serif" font-size="10" fill="#ffffff" text-anchor="middle" font-weight="bold">${title}</text>
      </svg>
    `;

    const bannerSvg = (title: string, fromColor: string, toColor: string) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" width="100%" height="100%">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${fromColor}"/>
            <stop offset="100%" stop-color="${toColor}"/>
          </linearGradient>
        </defs>
        <rect width="800" height="300" fill="url(#bg)"/>
        <circle cx="400" cy="150" r="70" fill="#ffffff" opacity="0.1"/>
        <text x="400" y="160" font-family="sans-serif" font-size="32" fill="#ffffff" text-anchor="middle" font-weight="bold">${title}</text>
      </svg>
    `;

    const productSvg = (title: string, color: string) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
        <rect width="128" height="128" rx="24" fill="${color}"/>
        <path d="M64 28 L98 46 L64 64 L30 46 Z M30 52 L60 68 L60 102 L30 86 Z M98 52 L68 68 L68 102 L98 86 Z" fill="#ffffff" opacity="0.95"/>
        <text x="64" y="118" font-family="sans-serif" font-size="9" fill="#ffffff" text-anchor="middle" font-weight="bold">${title}</text>
      </svg>
    `;

    const maybeUpload = async (key: string, svg: string, fallback: string) => {
      if (s3Client && PutCmd) {
        return uploadToR2(s3Client, PutCmd, bucketName, key, svg, 'image/svg+xml');
      }
      return fallback;
    };

    const [
      adminAvatarUrl,
      coffeeOwnerAvatarUrl,
      techOwnerAvatarUrl,
      bakeryOwnerAvatarUrl,
      coffeeLogoUrl,
      coffeeBannerUrl,
      techLogoUrl,
      techBannerUrl,
      bakeryLogoUrl,
      bakeryBannerUrl,
      prodCoffee1Url,
      prodCoffee2Url,
      prodCoffee3Url,
      prodCoffee4Url,
      prodCoffee5Url,
      prodCoffee6Url,
      prodTech1Url,
      prodTech2Url,
      prodTech3Url,
      prodTech4Url,
      prodTech5Url,
      prodTech6Url,
      prodBread1Url,
      prodBread2Url,
      prodBread3Url,
      prodBread4Url,
      prodBread5Url,
      prodBread6Url
    ] = await Promise.all([
      maybeUpload('avatars/admin.svg', avatarSvg('Адмін', '#0f172a'), '/storage/defaults/avatar.svg'),
      maybeUpload('avatars/taras-shevchuk.svg', avatarSvg('Тарас', '#78350f'), '/storage/defaults/avatar.svg'),
      maybeUpload('avatars/iryna-melnyk.svg', avatarSvg('Ірина', '#0284c7'), '/storage/defaults/avatar.svg'),
      maybeUpload('avatars/bohdan-kravchenko.svg', avatarSvg('Богдан', '#d97706'), '/storage/defaults/avatar.svg'),

      maybeUpload('stores/logos/lviv-coffee.svg', storeSvg('Кава', '#451a03'), '/storage/defaults/store.svg'),
      maybeUpload('stores/banners/lviv-coffee.svg', bannerSvg('Львівська Кавова Мануфактура', '#451a03', '#78350f'), '/storage/defaults/banner.svg'),
      maybeUpload('stores/logos/cybertech.svg', storeSvg('Tech', '#0f172a'), '/storage/defaults/store.svg'),
      maybeUpload('stores/banners/cybertech.svg', bannerSvg('CyberTech Ukraine', '#0f172a', '#1e293b'), '/storage/defaults/banner.svg'),
      maybeUpload('stores/logos/khlibna.svg', storeSvg('Хліб', '#b45309'), '/storage/defaults/store.svg'),
      maybeUpload('stores/banners/khlibna.svg', bannerSvg('Хлібна Майстерня', '#b45309', '#d97706'), '/storage/defaults/banner.svg'),

      maybeUpload('products/coffee-ethiopia.svg', productSvg('Ефіопія', '#78350f'), '/storage/defaults/product.svg'),
      maybeUpload('products/coffee-lviv-blend.svg', productSvg('Бленд', '#92400e'), '/storage/defaults/product.svg'),
      maybeUpload('products/coffee-colombia.svg', productSvg('Колумбія', '#713f12'), '/storage/defaults/product.svg'),
      maybeUpload('products/coffee-drip-mix.svg', productSvg('Дріп-сет', '#a16207'), '/storage/defaults/product.svg'),
      maybeUpload('products/coffee-syrnyk.svg', productSvg('Сирник', '#b45309'), '/storage/defaults/product.svg'),
      maybeUpload('products/coffee-strudel.svg', productSvg('Штрудель', '#d97706'), '/storage/defaults/product.svg'),

      maybeUpload('products/tech-cyberpods.svg', productSvg('Навушники', '#1e293b'), '/storage/defaults/product.svg'),
      maybeUpload('products/tech-cyberkey.svg', productSvg('Клавіатура', '#334155'), '/storage/defaults/product.svg'),
      maybeUpload('products/tech-cybermouse.svg', productSvg('Миша Pro', '#0f172a'), '/storage/defaults/product.svg'),
      maybeUpload('products/tech-usbc-hub.svg', productSvg('USB-C Хаб', '#1d4ed8'), '/storage/defaults/product.svg'),
      maybeUpload('products/tech-powerbank.svg', productSvg('Павербанк', '#0369a1'), '/storage/defaults/product.svg'),
      maybeUpload('products/tech-gan100w.svg', productSvg('GaN 100W', '#4338ca'), '/storage/defaults/product.svg'),

      maybeUpload('products/bread-tartin.svg', productSvg('Тартин', '#d97706'), '/storage/defaults/product.svg'),
      maybeUpload('products/bread-rye.svg', productSvg('Житній', '#92400e'), '/storage/defaults/product.svg'),
      maybeUpload('products/bread-baguette.svg', productSvg('Багет', '#b45309'), '/storage/defaults/product.svg'),
      maybeUpload('products/bread-croissant.svg', productSvg('Круасан', '#f59e0b'), '/storage/defaults/product.svg'),
      maybeUpload('products/bread-cinnamon.svg', productSvg('Кориця', '#ca8a04'), '/storage/defaults/product.svg'),
      maybeUpload('products/bread-quiche.svg', productSvg('Кіш', '#ea580c'), '/storage/defaults/product.svg')
    ]);

    // 3. Користувачі (Users)
    console.info('👤 Створення користувачів (платформа, власники, працівники та звичайні клієнти)...');
    const nowSub = Date.now();
    const in30Days = new Date(nowSub + 30 * 24 * 60 * 60 * 1000);
    const in365Days = new Date(nowSub + 365 * 24 * 60 * 60 * 1000);

    // 3a. Команда платформи BizX
    const [adminUser, platOpsUser, platSupportUser, platAnalystUser] = await db
      .insert(schema.users)
      .values([
        {
          email: 'admin@bizx.ua',
          name: 'Олександр Коваленко',
          passwordHash: PASSWORD_HASH,
          phone: '+380501234567',
          preferredLanguage: 'uk',
          subscriptionTier: 'business_enterprise',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: in365Days,
          avatarUrl: adminAvatarUrl
        },
        {
          email: 'ops.bizx@bizx.ua',
          name: 'Олена Сидоренко',
          passwordHash: PASSWORD_HASH,
          phone: '+380502223344',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'support.bizx@bizx.ua',
          name: 'Дмитро Поліщук',
          passwordHash: PASSWORD_HASH,
          phone: '+380503334455',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'analyst.bizx@bizx.ua',
          name: 'Наталія Лисенко',
          passwordHash: PASSWORD_HASH,
          phone: '+380504445566',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        }
      ])
      .returning();

    // 3b. Ролі платформи BizX та команда платформи (platform_members)
    console.info('🛡️ Створення ролей та команди платформи BizX...');
    const [platOwnerRole, platOpsRole, platSupportRole] = await db
      .insert(schema.roles)
      .values([
        {
          scope: 'platform',
          storeId: null,
          name: 'Власник платформи',
          icon: 'crown',
          color: '#0f172a',
          priority: OWNER_ROLE_PRIORITY,
          isSystem: true
        },
        {
          scope: 'platform',
          storeId: null,
          name: 'Операційний менеджер',
          icon: 'zap',
          color: '#2563eb',
          priority: 500,
          isSystem: false
        },
        {
          scope: 'platform',
          storeId: null,
          name: 'Підтримка та модерація',
          icon: 'headphones',
          color: '#059669',
          priority: 100,
          isSystem: false
        }
      ])
      .returning();

    await db.insert(schema.rolePermissions).values([
      ...PLATFORM_PERMISSIONS.map((p) => ({ roleId: platOwnerRole.id, permissionId: p.id })),
      ...[
        'platform.stores.read',
        'platform.stores.moderate',
        'platform.categories.manage',
        'platform.users.read',
        'platform.users.edit',
        'platform.analytics.read',
        'platform.analytics.export',
        'platform.staff.read',
        'platform.staff.write',
        'platform.staff.edit',
        'platform.roles.read',
        'platform.roles.write',
        'platform.roles.edit'
      ].map((c) => ({ roleId: platOpsRole.id, permissionId: permByCode.get(c)! })),
      ...['platform.stores.read', 'platform.users.read', 'platform.analytics.read'].map((c) => ({
        roleId: platSupportRole.id,
        permissionId: permByCode.get(c)!
      }))
    ]);

    const [, , , platAnalystMember] = await db
      .insert(schema.platformMembers)
      .values([
        {
          userId: adminUser.id,
          roleId: platOwnerRole.id,
          isCustom: false,
          isOwner: true,
          department: 'Керівництво'
        },
        {
          userId: platOpsUser.id,
          roleId: platOpsRole.id,
          isCustom: false,
          isOwner: false,
          department: 'Операційний відділ'
        },
        {
          userId: platSupportUser.id,
          roleId: platSupportRole.id,
          isCustom: false,
          isOwner: false,
          department: 'Служба підтримки'
        },
        {
          userId: platAnalystUser.id,
          roleId: null,
          isCustom: true,
          customPriority: 50,
          isOwner: false,
          department: 'Фінанси та аналітика'
        }
      ])
      .returning();

    await db.insert(schema.platformMemberPermissions).values(
      ['platform.analytics.read', 'platform.analytics.export', 'platform.stores.read'].map((c) => ({
        platformMemberId: platAnalystMember.id,
        permissionId: permByCode.get(c)!
      }))
    );

    // 3c. Власники бізнесів (з активними бізнес-підписками)
    const [coffeeOwner, techOwner, bakeryOwner] = await db
      .insert(schema.users)
      .values([
        {
          email: 'owner.coffee@bizx.ua',
          name: 'Тарас Шевчук',
          passwordHash: PASSWORD_HASH,
          phone: '+380671112233',
          preferredLanguage: 'uk',
          subscriptionTier: 'business_pro',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: in30Days,
          avatarUrl: coffeeOwnerAvatarUrl
        },
        {
          email: 'owner.tech@bizx.ua',
          name: 'Ірина Мельник',
          passwordHash: PASSWORD_HASH,
          phone: '+380934445566',
          preferredLanguage: 'uk',
          subscriptionTier: 'business_starter',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: in30Days,
          avatarUrl: techOwnerAvatarUrl
        },
        {
          email: 'owner.bakery@bizx.ua',
          name: 'Богдан Кравченко',
          passwordHash: PASSWORD_HASH,
          phone: '+380667778899',
          preferredLanguage: 'uk',
          subscriptionTier: 'business_starter',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: in30Days,
          avatarUrl: bakeryOwnerAvatarUrl
        }
      ])
      .returning();

    // 3d. Працівники бізнесів (звичайні акаунти без власних підписок, запрошені у команди магазинів)
    const [
      coffeeManagerUser,
      coffeeBaristaUser,
      coffeeCashierUser,
      coffeeAnalystUser,
      techManagerUser,
      techContentUser,
      techSalesUser,
      bakeryManagerUser,
      bakeryBakerUser,
      bakeryCourierUser
    ] = await db
      .insert(schema.users)
      .values([
        // Львівська Кавова Мануфактура
        {
          email: 'manager.coffee@bizx.ua',
          name: 'Андрій Гнатюк',
          passwordHash: PASSWORD_HASH,
          phone: '+380672223301',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'barista.coffee@bizx.ua',
          name: 'Софія Романюк',
          passwordHash: PASSWORD_HASH,
          phone: '+380672223302',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'cashier.coffee@bizx.ua',
          name: 'Максим Ткачук',
          passwordHash: PASSWORD_HASH,
          phone: '+380672223303',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'analyst.coffee@bizx.ua',
          name: 'Вікторія Савченко',
          passwordHash: PASSWORD_HASH,
          phone: '+380672223304',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        // CyberTech Ukraine
        {
          email: 'manager.tech@bizx.ua',
          name: 'Владислав Мороз',
          passwordHash: PASSWORD_HASH,
          phone: '+380935556601',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'content.tech@bizx.ua',
          name: 'Аліна Козак',
          passwordHash: PASSWORD_HASH,
          phone: '+380935556602',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'sales.tech@bizx.ua',
          name: 'Артем Захарченко',
          passwordHash: PASSWORD_HASH,
          phone: '+380935556603',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        // Хлібна Майстерня
        {
          email: 'manager.bakery@bizx.ua',
          name: 'Катерина Литвин',
          passwordHash: PASSWORD_HASH,
          phone: '+380668889901',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'baker.bakery@bizx.ua',
          name: 'Роман Дорошенко',
          passwordHash: PASSWORD_HASH,
          phone: '+380668889902',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'courier.bakery@bizx.ua',
          name: 'Юрій Петренко',
          passwordHash: PASSWORD_HASH,
          phone: '+380668889903',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        }
      ])
      .returning();

    // 3e. Звичайні користувачі (11 чистих акаунтів: без підписок, без бізнесів, без адмін-доступів)
    const regularUsers = await db
      .insert(schema.users)
      .values([
        {
          email: 'client@bizx.ua',
          name: 'Марія Бондаренко',
          passwordHash: PASSWORD_HASH,
          phone: '+380991239876',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user1@bizx.ua',
          name: 'Іван Ковальчук',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110001',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user2@bizx.ua',
          name: 'Ольга Савчук',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110002',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user3@bizx.ua',
          name: 'Денис Марченко',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110003',
          preferredLanguage: 'en',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user4@bizx.ua',
          name: 'Анастасія Павленко',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110004',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user5@bizx.ua',
          name: 'Павло Тимошенко',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110005',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user6@bizx.ua',
          name: 'Дарина Климчук',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110006',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user7@bizx.ua',
          name: 'Сергій Гриценко',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110007',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user8@bizx.ua',
          name: 'Тетяна Олійник',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110008',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user9@bizx.ua',
          name: 'Євгеній Білоус',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110009',
          preferredLanguage: 'en',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        },
        {
          email: 'user10@bizx.ua',
          name: 'Христина Василенко',
          passwordHash: PASSWORD_HASH,
          phone: '+380991110010',
          preferredLanguage: 'uk',
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          avatarUrl: '/storage/defaults/avatar.svg'
        }
      ])
      .returning();

    // 4. Категорії магазинів (Store Categories)
    console.info('🏷️ Створення категорій магазинів...');
    const [catCafes, catElectronics, catBakery] = await db
      .insert(schema.storeCategories)
      .values([
        {
          name: "Ресторани та кав'ярні",
          slug: 'restaurants-cafes',
          description: 'Смачна ресторанна їжа, свіжа авторська кава та фірмові десерти',
          icon: 'coffee',
          sortOrder: 1,
          isActive: true
        },
        {
          name: 'Електроніка та гаджети',
          slug: 'electronics',
          description: 'Смартфони, ноутбуки, компʼютерна периферія та розумна техніка',
          icon: 'smartphone',
          sortOrder: 2,
          isActive: true
        },
        {
          name: 'Пекарні та кондитерські',
          slug: 'bakeries',
          description: 'Ремісничий хліб на заквасці, домашнє печиво та круасани',
          icon: 'cake',
          sortOrder: 3,
          isActive: true
        },
        {
          name: 'Одяг та взуття',
          slug: 'apparel',
          description: 'Сучасний український одяг, взуття та стильні аксесуари',
          icon: 'shirt',
          sortOrder: 4,
          isActive: true
        },
        {
          name: "Краса та здоров'я",
          slug: 'beauty-health',
          description: 'Натуральна косметика, догляд за тілом та вітаміни',
          icon: 'heart',
          sortOrder: 5,
          isActive: true
        }
      ])
      .returning();

    // 5. Магазини (Stores)
    console.info('🏬 Створення магазинів...');
    const [storeCoffee, storeTech, storeBakery] = await db
      .insert(schema.stores)
      .values([
        {
          ownerId: coffeeOwner.id,
          categoryId: catCafes.id,
          name: 'Львівська Кавова Мануфактура',
          slug: 'lviv-coffee-factory',
          description:
            'Справжня львівська кава свіжого обсмаження, кавові бленди від майстрів та затишні десерти.',
          logoUrl: coffeeLogoUrl,
          bannerUrl: coffeeBannerUrl,
          address: 'м. Львів, вул. Вірменська, 15',
          phone: '+380322998877',
          email: 'info@lvivcoffee.ua',
          status: 'active'
        },
        {
          ownerId: techOwner.id,
          categoryId: catElectronics.id,
          name: 'CyberTech Ukraine',
          slug: 'cybertech-ua',
          description:
            'Офіційний дистрибʼютор сучасної компʼютерної техніки, ергономічної периферії та гаджетів.',
          logoUrl: techLogoUrl,
          bannerUrl: techBannerUrl,
          address: 'м. Київ, вул. Хрещатик, 24',
          phone: '+380442334455',
          email: 'sales@cybertech.ua',
          status: 'active'
        },
        {
          ownerId: bakeryOwner.id,
          categoryId: catBakery.id,
          name: 'Хлібна Майстерня',
          slug: 'khlibna-maisternia',
          description:
            'Крафтовий хліб тривалого бродіння, французькі круасани та випічка за традиційними рецептами.',
          logoUrl: bakeryLogoUrl,
          bannerUrl: bakeryBannerUrl,
          address: 'м. Київ, вул. Велика Васильківська, 42',
          phone: '+380445556677',
          email: 'order@khlibna.ua',
          status: 'active'
        }
      ])
      .returning();

    // 6. Ролі магазинів та команди (RBAC Roles & Store Members)
    console.info('👥 Створення ролей (включно з кастомними) та наповнення команд кожного бізнесу...');
    const seedStoreRoles = async (
      storeId: string,
      managerPermCodes: string[],
      extraRole: {
        name: string;
        icon: string | null;
        color: string;
        priority: number;
        permCodes: string[];
      }
    ) => {
      const [ownerR, managerR, customTierR, staffR] = await db
        .insert(schema.roles)
        .values([
          {
            scope: 'store',
            storeId,
            name: 'Власник',
            icon: 'crown',
            color: '#0f172a',
            priority: OWNER_ROLE_PRIORITY,
            isSystem: true
          },
          {
            scope: 'store',
            storeId,
            name: 'Керуючий',
            icon: 'briefcase',
            color: '#2563eb',
            priority: 500,
            isSystem: false
          },
          {
            scope: 'store',
            storeId,
            name: extraRole.name,
            icon: extraRole.icon,
            color: extraRole.color,
            priority: extraRole.priority,
            isSystem: false
          },
          {
            scope: 'store',
            storeId,
            name: 'Персонал',
            icon: 'shopping-bag',
            color: '#475569',
            priority: 100,
            isSystem: false
          }
        ])
        .returning();

      await db.insert(schema.rolePermissions).values([
        ...STORE_PERMISSIONS.map((p) => ({ roleId: ownerR.id, permissionId: p.id })),
        ...managerPermCodes.map((c) => ({ roleId: managerR.id, permissionId: permByCode.get(c)! })),
        ...extraRole.permCodes.map((c) => ({
          roleId: customTierR.id,
          permissionId: permByCode.get(c)!
        })),
        ...['products.read', 'orders.read', 'orders.edit'].map((c) => ({
          roleId: staffR.id,
          permissionId: permByCode.get(c)!
        }))
      ]);

      return {
        ownerRoleId: ownerR.id,
        managerRoleId: managerR.id,
        extraRoleId: customTierR.id,
        staffRoleId: staffR.id
      };
    };

    const coffeeRoles = await seedStoreRoles(
      storeCoffee.id,
      // Керуючий у кавʼярні має 1 галочку «Адміністратор» (повний доступ крім ownerOnly прав власника)
      ['store.admin'],
      {
        name: 'Старший бариста',
        icon: 'coffee',
        color: '#d97706',
        priority: 300,
        permCodes: ['products.read', 'products.write', 'orders.read', 'orders.edit']
      }
    );

    const techRoles = await seedStoreRoles(
      storeTech.id,
      // Керуючий без store.admin і без архівації персоналу/ролей
      [
        'products.read',
        'products.write',
        'products.edit',
        'products.status',
        'products.archive',
        'orders.read',
        'orders.edit',
        'analytics.read',
        'analytics.export',
        'store.read',
        'store.edit',
        'staff.read',
        'staff.write',
        'staff.edit',
        'roles.read',
        'roles.write',
        'roles.edit'
      ],
      {
        name: 'Контент-менеджер',
        icon: 'package',
        color: '#7c3aed',
        priority: 250,
        permCodes: ['products.read', 'products.write', 'products.edit', 'products.status']
      }
    );

    const bakeryRoles = await seedStoreRoles(
      storeBakery.id,
      [
        'products.read',
        'products.write',
        'products.edit',
        'products.status',
        'products.archive',
        'orders.read',
        'orders.edit',
        'analytics.read',
        'analytics.export',
        'store.read',
        'store.edit',
        'staff.read',
        'staff.write',
        'staff.edit',
        'staff.archive',
        'roles.read',
        'roles.write',
        'roles.edit',
        'roles.archive'
      ],
      {
        name: 'Пекар-технолог',
        icon: 'flame',
        color: '#b45309',
        priority: 250,
        permCodes: ['products.read', 'products.write', 'products.edit', 'orders.read']
      }
    );

    const insertedMembers = await db
      .insert(schema.storeMembers)
      .values([
        // --- Львівська Кавова Мануфактура (власник + 4 працівники) ---
        {
          storeId: storeCoffee.id,
          userId: coffeeOwner.id,
          roleId: coffeeRoles.ownerRoleId,
          isCustom: false
        },
        {
          storeId: storeCoffee.id,
          userId: coffeeManagerUser.id,
          roleId: coffeeRoles.managerRoleId,
          isCustom: false
        },
        {
          storeId: storeCoffee.id,
          userId: coffeeBaristaUser.id,
          roleId: coffeeRoles.extraRoleId,
          isCustom: false
        },
        {
          storeId: storeCoffee.id,
          userId: coffeeCashierUser.id,
          roleId: coffeeRoles.staffRoleId,
          isCustom: false
        },
        {
          storeId: storeCoffee.id,
          userId: coffeeAnalystUser.id,
          roleId: null,
          isCustom: true,
          customPriority: 50
        },

        // --- CyberTech Ukraine (власниця + 3 працівники) ---
        {
          storeId: storeTech.id,
          userId: techOwner.id,
          roleId: techRoles.ownerRoleId,
          isCustom: false
        },
        {
          storeId: storeTech.id,
          userId: techManagerUser.id,
          roleId: techRoles.managerRoleId,
          isCustom: false
        },
        {
          storeId: storeTech.id,
          userId: techContentUser.id,
          roleId: techRoles.extraRoleId,
          isCustom: false
        },
        {
          storeId: storeTech.id,
          userId: techSalesUser.id,
          roleId: techRoles.staffRoleId,
          isCustom: false
        },

        // --- Хлібна Майстерня (власник + 3 працівники) ---
        {
          storeId: storeBakery.id,
          userId: bakeryOwner.id,
          roleId: bakeryRoles.ownerRoleId,
          isCustom: false
        },
        {
          storeId: storeBakery.id,
          userId: bakeryManagerUser.id,
          roleId: bakeryRoles.managerRoleId,
          isCustom: false
        },
        {
          storeId: storeBakery.id,
          userId: bakeryBakerUser.id,
          roleId: bakeryRoles.extraRoleId,
          isCustom: false
        },
        {
          storeId: storeBakery.id,
          userId: bakeryCourierUser.id,
          roleId: null,
          isCustom: true,
          customPriority: 50
        }
      ])
      .returning();

    const coffeeAnalystMember = insertedMembers.find((m) => m.userId === coffeeAnalystUser.id)!;
    const bakeryCourierMember = insertedMembers.find((m) => m.userId === bakeryCourierUser.id)!;

    await db.insert(schema.storeMemberPermissions).values([
      ...['analytics.read', 'analytics.export', 'orders.read'].map((c) => ({
        storeMemberId: coffeeAnalystMember.id,
        permissionId: permByCode.get(c)!
      })),
      ...['orders.read', 'orders.edit'].map((c) => ({
        storeMemberId: bakeryCourierMember.id,
        permissionId: permByCode.get(c)!
      }))
    ]);

    // 7. Категорії товарів (6 категорій по 2 на магазин)
    console.info('📑 Створення категорій товарів...');
    const [
      pCatCoffeeBeans,
      pCatCoffeeDesserts,
      pCatTechAccessories,
      pCatTechPower,
      pCatBakeryBread,
      pCatBakeryPastry
    ] = await db
      .insert(schema.productCategories)
      .values([
        { storeId: storeCoffee.id, name: 'Зернова та дріп-кава', sortOrder: 1 },
        { storeId: storeCoffee.id, name: 'Десерти та випічка', sortOrder: 2 },
        { storeId: storeTech.id, name: 'Периферія та аксесуари', sortOrder: 1 },
        { storeId: storeTech.id, name: 'Зарядка та живлення', sortOrder: 2 },
        { storeId: storeBakery.id, name: 'Хліб на заквасці', sortOrder: 1 },
        { storeId: storeBakery.id, name: 'Круасани та солона випічка', sortOrder: 2 }
      ])
      .returning();

    // 8. Товари (18 товарів: по 6 на кожен магазин)
    console.info('📦 Створення каталогу товарів (18 позицій)...');
    const coffeeProducts = await db
      .insert(schema.products)
      .values([
        {
          storeId: storeCoffee.id,
          categoryId: pCatCoffeeBeans.id,
          name: 'Арабіка Ефіопія Їргачиф (250г)',
          sku: 'COF-ETH-250',
          description:
            'Яскравий квітковий аромат з нотами бергамоту, жасмину та цитрусових фруктів. Свіже обсмаження.',
          price: 38000,
          oldPrice: 42000,
          imageUrl: prodCoffee1Url,
          inventoryCount: 45,
          isActive: true
        },
        {
          storeId: storeCoffee.id,
          categoryId: pCatCoffeeBeans.id,
          name: 'Фірмовий Бленд «Львівський Ранок» (1кг)',
          sku: 'COF-LVIV-1KG',
          description:
            'Збалансований бленд з шоколадно-горіховим смаком та оксамитовою пінкою крема. Ідеально для еспресо.',
          price: 85000,
          oldPrice: 95000,
          imageUrl: prodCoffee2Url,
          inventoryCount: 30,
          isActive: true
        },
        {
          storeId: storeCoffee.id,
          categoryId: pCatCoffeeBeans.id,
          name: 'Колумбія Супремо Медельїн (500г)',
          sku: 'COF-COL-500',
          description:
            'Насичена кава середнього обсмаження з відтінками карамелі, стиглої вишні та какао.',
          price: 59000,
          oldPrice: null,
          imageUrl: prodCoffee3Url,
          inventoryCount: 38,
          isActive: true
        },
        {
          storeId: storeCoffee.id,
          categoryId: pCatCoffeeBeans.id,
          name: 'Дріп-кава Дегустаційний Мікс (10 шт)',
          sku: 'COF-DRIP-10',
          description:
            'Зручний формат заварювання у чашці: 5 сортів спешелті арабіки для офісу та подорожей.',
          price: 32000,
          oldPrice: 36000,
          imageUrl: prodCoffee4Url,
          inventoryCount: 60,
          isActive: true
        },
        {
          storeId: storeCoffee.id,
          categoryId: pCatCoffeeDesserts.id,
          name: 'Львівський сирник з шоколадною глазурʼю',
          sku: 'DES-SYRNYK',
          description:
            'Класичний ніжний сирник з родзинками за автентичним галицьким рецептом, вкритий чорним шоколадом.',
          price: 13500,
          oldPrice: null,
          imageUrl: prodCoffee5Url,
          inventoryCount: 25,
          isActive: true
        },
        {
          storeId: storeCoffee.id,
          categoryId: pCatCoffeeDesserts.id,
          name: 'Яблучний штрудель з ванільним соусом',
          sku: 'DES-STRUDEL',
          description:
            'Тонке витяжне тісто, карамелізовані яблука з корицею, грецькі горіхи та теплий ванільний соус.',
          price: 14500,
          oldPrice: 16500,
          imageUrl: prodCoffee6Url,
          inventoryCount: 18,
          isActive: true
        }
      ])
      .returning();

    const techProducts = await db
      .insert(schema.products)
      .values([
        {
          storeId: storeTech.id,
          categoryId: pCatTechAccessories.id,
          name: 'Бездротові навушники CyberPods Pro ANC',
          sku: 'TECH-PODS-PRO',
          description:
            'Активне шумозаглушення (ANC), до 36 годин роботи з кейсом, підтримка швидкої бездротової зарядки.',
          price: 249900,
          oldPrice: 289900,
          imageUrl: prodTech1Url,
          inventoryCount: 22,
          isActive: true
        },
        {
          storeId: storeTech.id,
          categoryId: pCatTechAccessories.id,
          name: 'Механічна клавіатура CyberKey RGB (Linear Red)',
          sku: 'TECH-KEY-RGB',
          description:
            'Компактний формат 75%, тихі лінійні перемикачі, гаряча заміна (Hot-Swap) та PBT-ковпачки з укр. гравіюванням.',
          price: 329900,
          oldPrice: 360000,
          imageUrl: prodTech2Url,
          inventoryCount: 14,
          isActive: true
        },
        {
          storeId: storeTech.id,
          categoryId: pCatTechAccessories.id,
          name: 'Бездротова миша CyberMouse Pro UltraLight',
          sku: 'TECH-MOUSE-PRO',
          description:
            'Сенсор 26000 DPI, вага 54 г, підключення 2.4 ГГц + Bluetooth, до 80 годин автономної роботи.',
          price: 189900,
          oldPrice: 215000,
          imageUrl: prodTech3Url,
          inventoryCount: 28,
          isActive: true
        },
        {
          storeId: storeTech.id,
          categoryId: pCatTechAccessories.id,
          name: 'USB-C Хаб 8-в-1 Aluminum 4K HDMI / PD 100W',
          sku: 'TECH-HUB-8IN1',
          description:
            'Алюмінієвий корпус, HDMI 4K@60Hz, Gigabit Ethernet, кардрідер SD/TF та наскрізна зарядка 100W.',
          price: 125000,
          oldPrice: null,
          imageUrl: prodTech4Url,
          inventoryCount: 40,
          isActive: true
        },
        {
          storeId: storeTech.id,
          categoryId: pCatTechPower.id,
          name: 'Павербанк CyberCharge 20000mAh PD 65W',
          sku: 'TECH-PWR-20K',
          description:
            'Швидка зарядка ноутбуків та смартфонів до 65W, цифровий дисплей заряду, 2x USB-C + USB-A.',
          price: 219000,
          oldPrice: 249000,
          imageUrl: prodTech5Url,
          inventoryCount: 35,
          isActive: true
        },
        {
          storeId: storeTech.id,
          categoryId: pCatTechPower.id,
          name: 'GaN Зарядний пристрій 100W (3xUSB-C + USB-A)',
          sku: 'TECH-GAN-100W',
          description:
            'Компактний блок живлення нового покоління GaN для одночасної зарядки MacBook, планшета та телефону.',
          price: 159000,
          oldPrice: 179000,
          imageUrl: prodTech6Url,
          inventoryCount: 50,
          isActive: true
        }
      ])
      .returning();

    const bakeryProducts = await db
      .insert(schema.products)
      .values([
        {
          storeId: storeBakery.id,
          categoryId: pCatBakeryBread.id,
          name: 'Хліб тартин на пшеничній заквасці (550г)',
          sku: 'BRD-TARTIN',
          description:
            'Хрустка скоринка та пористий ніжний мʼякуш з легкою кислинкою. Випікається у подовій печі.',
          price: 6800,
          oldPrice: null,
          imageUrl: prodBread1Url,
          inventoryCount: 35,
          isActive: true
        },
        {
          storeId: storeBakery.id,
          categoryId: pCatBakeryBread.id,
          name: 'Житній солодовий хліб з насінням (600г)',
          sku: 'BRD-RYE-SEED',
          description:
            'Ароматний житній хліб на ферментованому солоді з гарбузовим, лляним та соняшниковим насінням.',
          price: 7400,
          oldPrice: null,
          imageUrl: prodBread2Url,
          inventoryCount: 28,
          isActive: true
        },
        {
          storeId: storeBakery.id,
          categoryId: pCatBakeryBread.id,
          name: 'Багет французький традиційний (280г)',
          sku: 'BRD-BAGUETTE',
          description:
            'Класичний хрусткий багет холодної ферментації на борошні Т65 — свіжий щоранку.',
          price: 5200,
          oldPrice: null,
          imageUrl: prodBread3Url,
          inventoryCount: 45,
          isActive: true
        },
        {
          storeId: storeBakery.id,
          categoryId: pCatBakeryPastry.id,
          name: 'Французький круасан з мигдалевим кремом',
          sku: 'BRD-CROISSANT-ALM',
          description:
            'Багатошарове листкове тісто на вершковому маслі 82% з ніжною мигдалевою начинкою франжипан.',
          price: 9500,
          oldPrice: 11000,
          imageUrl: prodBread4Url,
          inventoryCount: 50,
          isActive: true
        },
        {
          storeId: storeBakery.id,
          categoryId: pCatBakeryPastry.id,
          name: 'Равлик з корицею та крем-сиром',
          sku: 'BRD-CINNAMON',
          description:
            'Пухка здобна булочка з цейлонською корицею, тростинним цукром та глазурʼю з маскарпоне.',
          price: 8500,
          oldPrice: null,
          imageUrl: prodBread5Url,
          inventoryCount: 32,
          isActive: true
        },
        {
          storeId: storeBakery.id,
          categoryId: pCatBakeryPastry.id,
          name: 'Кіш з лососем, шпинатом та броколі (цілий)',
          sku: 'BRD-QUICHE-SALMON',
          description:
            'Пісочна основа на вершковому маслі, слабосолений лосось, броколі та вершкова заливка з пармезаном.',
          price: 36000,
          oldPrice: 39500,
          imageUrl: prodBread6Url,
          inventoryCount: 12,
          isActive: true
        }
      ])
      .returning();

    // 9. Розширена історія замовлень (96 замовлень за останні 175 днів для повної аналітики)
    console.info('💳 Генерація 96 замовлень по різних датах, товарах, клієнтах та статусах...');

    const rng = createRng(20261119);
    const nowMs = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const HOUR_MS = 60 * 60 * 1000;

    const deliveryAddresses = [
      'м. Київ, вул. Саксаганського, 10, кв. 24',
      'м. Київ, Нова Пошта Відділення №45',
      'м. Київ, вул. Антоновича, 55, підʼїзд 2',
      'м. Львів, пр-т Свободи, 28, офіс 14',
      'м. Львів, вул. Городоцька, 112, кв. 8',
      'м. Одеса, вул. Дерибасівська, 19',
      'м. Дніпро, Нова Пошта Поштомат №1204',
      'м. Харків, вул. Сумська, 74, кв. 19',
      'м. Вінниця, вул. Соборна, 41',
      'м. Івано-Франківськ, вул. Незалежності, 30',
      'Самовивіз із закладу'
    ];

    const orderNotes = [
      null,
      null,
      'Домофон 24, залишити біля дверей якщо не відповім',
      'Зателефонуйте за 15 хвилин до доставки',
      'Швидка доставка, дякую!',
      'Прошу додати чек у пакунок',
      'Безконтактна доставка',
      'Подарункове пакування якщо можливо'
    ];

    const paymentMethods = ['card', 'online', 'cash'] as const;

    // Різноманітні зсуви в днях для кожного з 3 магазинів (32 замовлення на магазин = 96 всього):
    // • Сьогодні (0 днів) — 3 замовлення на магазин (працює фільтр «За день»)
    // • Останній тиждень (1–6 днів) — 7 замовлень на магазин (працює фільтр «За тиждень»)
    // • Останній місяць (7–29 днів) — 10 замовлень на магазин (працює фільтр «За місяць»)
    // • Попередні 5 місяців (32–172 дні) — 12 замовлень на магазин (графік по місяцях і «За рік»)
    const dayOffsetsTemplate = [
      0, 0, 0,
      1, 1, 2, 3, 4, 5, 6,
      8, 10, 12, 14, 16, 19, 21, 24, 26, 28,
      34, 42, 51, 63, 75, 88, 99, 114, 127, 141, 156, 170
    ];

    const storeCatalogs = [
      { store: storeCoffee, products: coffeeProducts, maxQty: 4 },
      { store: storeTech, products: techProducts, maxQty: 2 },
      { store: storeBakery, products: bakeryProducts, maxQty: 5 }
    ];

    const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;

    let orderSeq = 1;
    let totalOrderItemsCount = 0;

    for (let sIdx = 0; sIdx < storeCatalogs.length; sIdx++) {
      const { store, products, maxQty } = storeCatalogs[sIdx]!;

      for (let i = 0; i < dayOffsetsTemplate.length; i++) {
        const baseDaysAgo = dayOffsetsTemplate[i]!;
        // Невелике зміщення в межах дня/години, але для 0 днів тримаємо в межах останніх 12 годин
        const createdAt =
          baseDaysAgo === 0
            ? new Date(nowMs - Math.floor((1 + rng() * 10) * HOUR_MS))
            : new Date(
                nowMs -
                  (baseDaysAgo + (sIdx === 1 ? 0 : sIdx === 2 ? 1 : 0)) * DAY_MS -
                  Math.floor(rng() * 14 * HOUR_MS)
              );

        const customer = regularUsers[(orderSeq * 3 + sIdx + i) % regularUsers.length]!;

        // Статус залежить від давності замовлення (свіжі частіше в роботі, старіші — доставлені або скасовані)
        let status: 'pending' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
        let paymentStatus: 'pending' | 'paid' | 'failed';
        const roll = rng();

        if (baseDaysAgo === 0) {
          if (roll < 0.35) {
            status = 'pending';
            paymentStatus = 'pending';
          } else if (roll < 0.65) {
            status = 'confirmed';
            paymentStatus = 'paid';
          } else if (roll < 0.85) {
            status = 'paid';
            paymentStatus = 'paid';
          } else {
            status = 'shipped';
            paymentStatus = 'paid';
          }
        } else if (baseDaysAgo <= 5) {
          if (roll < 0.4) {
            status = 'delivered';
            paymentStatus = 'paid';
          } else if (roll < 0.72) {
            status = 'shipped';
            paymentStatus = 'paid';
          } else if (roll < 0.88) {
            status = 'confirmed';
            paymentStatus = 'paid';
          } else {
            status = 'cancelled';
            paymentStatus = roll < 0.94 ? 'failed' : 'pending';
          }
        } else {
          if (roll < 0.82) {
            status = 'delivered';
            paymentStatus = 'paid';
          } else if (roll < 0.9) {
            status = 'shipped';
            paymentStatus = 'paid';
          } else {
            status = 'cancelled';
            paymentStatus = 'failed';
          }
        }

        // Обираємо 1–3 унікальні товари в замовлення з різною кількістю
        const lineCount = 1 + Math.floor(rng() * 3); // 1..3 позиції
        const shuffledProducts = [...products].sort(() => rng() - 0.5);
        const chosenProducts = shuffledProducts.slice(0, lineCount);

        const itemsDraft = chosenProducts.map((prod) => {
          const quantity = 1 + Math.floor(rng() * maxQty);
          return {
            productId: prod.id,
            productName: prod.name,
            unitPrice: prod.price,
            quantity,
            totalPrice: prod.price * quantity,
            createdAt
          };
        });

        const totalAmount = itemsDraft.reduce((acc, item) => acc + item.totalPrice, 0);
        const orderNumber = `ORD-2026-${String(orderSeq).padStart(3, '0')}`;
        orderSeq++;

        const [insertedOrder] = await db
          .insert(schema.orders)
          .values({
            orderNumber,
            storeId: store.id,
            customerId: customer.id,
            status,
            totalAmount,
            deliveryAddress: pick(deliveryAddresses),
            contactPhone: customer.phone || '+380991239876',
            contactName: customer.name,
            paymentStatus,
            paymentMethod: pick(paymentMethods),
            notes: pick(orderNotes),
            createdAt,
            updatedAt: createdAt
          })
          .returning();

        await db.insert(schema.orderItems).values(
          itemsDraft.map((item) => ({
            ...item,
            orderId: insertedOrder.id
          }))
        );
        totalOrderItemsCount += itemsDraft.length;
      }
    }

    const totalOrdersCount = orderSeq - 1;

    console.info('✅ Наповнення тестовими даними успішно завершено!');
    console.info(`
════════════════════════════════════════════════════════════════════════════════════
 🚀 ТЕСТОВІ АКАУНТИ BIZX PLATFORM (пароль для ВСІХ: password123)
════════════════════════════════════════════════════════════════════════════════════

 🛡️  КОМАНДА ПЛАТФОРМИ BIZX (вхід у BizX Core Admin):
 ──────────────────────────────────────────────────────────────────────────────────
 • admin@bizx.ua           | +380501234567 | 👑 Власник платформи (priority 10000)
 • ops.bizx@bizx.ua        | +380502223344 | ⚡ Операційний менеджер (priority 500)
 • support.bizx@bizx.ua    | +380503334455 | 🎧 Підтримка та модерація (priority 100)
 • analyst.bizx@bizx.ua    | +380504445566 | ⚙️ Custom (аналітика + експорт + магазини)

 🏬 ВЛАСНИКИ БІЗНЕСІВ (активні бізнес-підписки, вхід у BizX Business Admin):
 ──────────────────────────────────────────────────────────────────────────────────
 • owner.coffee@bizx.ua    | +380671112233 | 👑 Львівська Кавова Мануфактура (PRO)
 • owner.tech@bizx.ua      | +380934445566 | 👑 CyberTech Ukraine (STARTER)
 • owner.bakery@bizx.ua    | +380667778899 | 👑 Хлібна Майстерня (STARTER)

 👥 ПРАЦІВНИКИ БІЗНЕСІВ (без власних підписок, різні ролі та Custom-доступи):
 ──────────────────────────────────────────────────────────────────────────────────
 [Львівська Кавова Мануфактура]
 • manager.coffee@bizx.ua  | +380672223301 | 💼 Керуючий (priority 500, store.admin)
 • barista.coffee@bizx.ua  | +380672223302 | ☕ Старший бариста (priority 300)
 • cashier.coffee@bizx.ua  | +380672223303 | 🛒 Персонал (priority 100, без store.read)
 • analyst.coffee@bizx.ua  | +380672223304 | ⚙️ Custom (аналітика + експорт + замовлення)

 [CyberTech Ukraine]
 • manager.tech@bizx.ua    | +380935556601 | 💼 Керуючий (priority 500, без store.admin)
 • content.tech@bizx.ua    | +380935556602 | 📦 Контент-менеджер (priority 250, товари без archive)
 • sales.tech@bizx.ua      | +380935556603 | 🛒 Персонал (priority 100, без store.read)

 [Хлібна Майстерня]
 • manager.bakery@bizx.ua  | +380668889901 | 💼 Керуючий (priority 500)
 • baker.bakery@bizx.ua    | +380668889902 | 🔥 Пекар-технолог (priority 250, без status/archive)
 • courier.bakery@bizx.ua  | +380668889903 | ⚙️ Custom (тільки замовлення read/edit)

 👤 ЗВИЧАЙНІ КОРИСТУВАЧІ (11 чистих акаунтів БЕЗ підписок, бізнесів і доступів):
 ──────────────────────────────────────────────────────────────────────────────────
 • client@bizx.ua          | +380991239876 | Марія Бондаренко
 • user1@bizx.ua           | +380991110001 | Іван Ковальчук
 • user2@bizx.ua           | +380991110002 | Ольга Савчук
 • user3@bizx.ua           | +380991110003 | Денис Марченко
 • user4@bizx.ua           | +380991110004 | Анастасія Павленко
 • user5@bizx.ua           | +380991110005 | Павло Тимошенко
 • user6@bizx.ua           | +380991110006 | Дарина Климчук
 • user7@bizx.ua           | +380991110007 | Сергій Гриценко
 • user8@bizx.ua           | +380991110008 | Тетяна Олійник
 • user9@bizx.ua           | +380991110009 | Євгеній Білоус
 • user10@bizx.ua          | +380991110010 | Христина Василенко

 📊 ЗГЕНЕРОВАНІ ДАНІ ДЛЯ АНАЛІТИКИ:
 ──────────────────────────────────────────────────────────────────────────────────
 • Користувачів всього:    28 (4 платформа + 3 власники + 10 працівників + 11 клієнтів)
 • Магазинів / Товарів:    3 магазини / 18 товарів у 6 категоріях
 • Замовлень / Позицій:    ${totalOrdersCount} замовлень / ${totalOrderItemsCount} позицій (за останні 175 днів)
════════════════════════════════════════════════════════════════════════════════════
    `);
  } catch (error) {
    console.error('❌ Помилка під час наповнення тестовими даними:', error);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

seed();
