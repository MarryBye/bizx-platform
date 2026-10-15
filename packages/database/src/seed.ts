import * as dotenv from 'dotenv';
import * as path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';
import { sql } from 'drizzle-orm';

// Завантажуємо змінні оточення
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bizx_db';

const queryClient = postgres(connectionString, { max: 5 });
const db = drizzle(queryClient, { schema });

// bcrypt хэш для тестового пароля: "password123"
const PASSWORD_HASH = '$2b$10$HPDJ8QBCeeaHqSugqyYmee0NR1Ab3dWqnsUY7mBdVyWJUe4cimoei';

// Функция загрузки файла в Cloudflare R2
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
  console.info('🌱 Початок наповнення бази даних тестовими даними (seeds)...');

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
        store_members,
        stores,
        store_categories,
        refresh_tokens,
        users
      CASCADE;
    `);

    // Завантажуємо медіафайли в R2 якщо клієнт доступний
    console.info('📤 Завантаження стартових медіафайлів у Cloudflare R2...');

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

    let adminAvatarUrl = '/storage/defaults/avatar.svg';
    let coffeeOwnerAvatarUrl = '/storage/defaults/avatar.svg';
    let techOwnerAvatarUrl = '/storage/defaults/avatar.svg';
    let bakeryOwnerAvatarUrl = '/storage/defaults/avatar.svg';

    let coffeeLogoUrl = '/storage/defaults/store.svg';
    let coffeeBannerUrl = '/storage/defaults/banner.svg';
    let techLogoUrl = '/storage/defaults/store.svg';
    let techBannerUrl = '/storage/defaults/banner.svg';
    let bakeryLogoUrl = '/storage/defaults/store.svg';
    let bakeryBannerUrl = '/storage/defaults/banner.svg';

    let prodCoffee1Url = '/storage/defaults/product.svg';
    let prodCoffee2Url = '/storage/defaults/product.svg';
    let prodCoffeeDessertUrl = '/storage/defaults/product.svg';
    let prodTech1Url = '/storage/defaults/product.svg';
    let prodTech2Url = '/storage/defaults/product.svg';
    let prodBread1Url = '/storage/defaults/product.svg';
    let prodBread2Url = '/storage/defaults/product.svg';

    if (s3Client && PutCmd) {
      adminAvatarUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'avatars/admin.svg',
        avatarSvg('Адмін', '#0f172a'),
        'image/svg+xml'
      );
      coffeeOwnerAvatarUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'avatars/taras-shevchuk.svg',
        avatarSvg('Тарас', '#78350f'),
        'image/svg+xml'
      );
      techOwnerAvatarUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'avatars/iryna-melnyk.svg',
        avatarSvg('Ірина', '#0284c7'),
        'image/svg+xml'
      );
      bakeryOwnerAvatarUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'avatars/bohdan-kravchenko.svg',
        avatarSvg('Богдан', '#d97706'),
        'image/svg+xml'
      );

      coffeeLogoUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'stores/logos/lviv-coffee.svg',
        storeSvg('Кава', '#451a03'),
        'image/svg+xml'
      );
      coffeeBannerUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'stores/banners/lviv-coffee.svg',
        bannerSvg('Львівська Кавова Мануфактура', '#451a03', '#78350f'),
        'image/svg+xml'
      );

      techLogoUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'stores/logos/cybertech.svg',
        storeSvg('Tech', '#0f172a'),
        'image/svg+xml'
      );
      techBannerUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'stores/banners/cybertech.svg',
        bannerSvg('CyberTech Ukraine', '#0f172a', '#1e293b'),
        'image/svg+xml'
      );

      bakeryLogoUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'stores/logos/khlibna.svg',
        storeSvg('Хліб', '#b45309'),
        'image/svg+xml'
      );
      bakeryBannerUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'stores/banners/khlibna.svg',
        bannerSvg('Хлібна Майстерня', '#b45309', '#d97706'),
        'image/svg+xml'
      );

      prodCoffee1Url = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'products/coffee-ethiopia.svg',
        productSvg('Ефіопія', '#78350f'),
        'image/svg+xml'
      );
      prodCoffee2Url = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'products/coffee-lviv-blend.svg',
        productSvg('Бленд', '#92400e'),
        'image/svg+xml'
      );
      prodCoffeeDessertUrl = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'products/coffee-syrnyk.svg',
        productSvg('Сирник', '#b45309'),
        'image/svg+xml'
      );

      prodTech1Url = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'products/tech-cyberpods.svg',
        productSvg('Навушники', '#1e293b'),
        'image/svg+xml'
      );
      prodTech2Url = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'products/tech-cyberkey.svg',
        productSvg('Клавіатура', '#334155'),
        'image/svg+xml'
      );

      prodBread1Url = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'products/bread-tartin.svg',
        productSvg('Тартин', '#d97706'),
        'image/svg+xml'
      );
      prodBread2Url = await uploadToR2(
        s3Client,
        PutCmd,
        bucketName,
        'products/bread-croissant.svg',
        productSvg('Круасан', '#f59e0b'),
        'image/svg+xml'
      );
    }

    // 2. Користувачі (Users)
    console.info('👤 Створення користувачів...');
    await db.insert(schema.users).values({
      email: 'admin@bizx.ua',
      name: 'Олександр Коваленко',
      passwordHash: PASSWORD_HASH,
      role: 'admin',
      systemRole: 'platform_admin',
      phone: '+380501234567',
      avatarUrl: adminAvatarUrl
    });

    const [coffeeOwner] = await db
      .insert(schema.users)
      .values({
        email: 'owner.coffee@bizx.ua',
        name: 'Тарас Шевчук',
        passwordHash: PASSWORD_HASH,
        role: 'business_owner',
        phone: '+380671112233',
        avatarUrl: coffeeOwnerAvatarUrl
      })
      .returning();

    const [techOwner] = await db
      .insert(schema.users)
      .values({
        email: 'owner.tech@bizx.ua',
        name: 'Ірина Мельник',
        passwordHash: PASSWORD_HASH,
        role: 'business_owner',
        phone: '+380934445566',
        avatarUrl: techOwnerAvatarUrl
      })
      .returning();

    const [bakeryOwner] = await db
      .insert(schema.users)
      .values({
        email: 'owner.bakery@bizx.ua',
        name: 'Богдан Кравченко',
        passwordHash: PASSWORD_HASH,
        role: 'business_owner',
        phone: '+380667778899',
        avatarUrl: bakeryOwnerAvatarUrl
      })
      .returning();

    // Клієнт: використовує аватарку-заглушку за замовчуванням
    const [clientUser] = await db
      .insert(schema.users)
      .values({
        email: 'client@bizx.ua',
        name: 'Марія Бондаренко',
        passwordHash: PASSWORD_HASH,
        role: 'client',
        phone: '+380991239876',
        avatarUrl: '/storage/defaults/avatar.svg' // Статична заглушка
      })
      .returning();

    // 3. Категорії магазинів (Store Categories)
    console.info('🏷️ Створення категорій магазинів...');
    const [catCafes] = await db
      .insert(schema.storeCategories)
      .values({
        name: "Ресторани та кав'ярні",
        slug: 'restaurants-cafes',
        description: 'Смачна ресторанна їжа, свіжа авторська кава та фірмові десерти',
        icon: 'coffee',
        sortOrder: 1,
        isActive: true
      })
      .returning();

    const [catElectronics] = await db
      .insert(schema.storeCategories)
      .values({
        name: 'Електроніка та гаджети',
        slug: 'electronics',
        description: 'Смартфони, ноутбуки, компʼютерна периферія та розумна техніка',
        icon: 'smartphone',
        sortOrder: 2,
        isActive: true
      })
      .returning();

    const [catBakery] = await db
      .insert(schema.storeCategories)
      .values({
        name: 'Пекарні та кондитерські',
        slug: 'bakeries',
        description: 'Ремісничий хліб на заквасці, домашнє печиво та круасани',
        icon: 'cake',
        sortOrder: 3,
        isActive: true
      })
      .returning();

    await db.insert(schema.storeCategories).values([
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
    ]);

    // 4. Магазини (Stores) з медіафайлами в Cloudflare R2
    console.info('🏬 Створення магазинів...');
    const [storeCoffee] = await db
      .insert(schema.stores)
      .values({
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
      })
      .returning();

    const [storeTech] = await db
      .insert(schema.stores)
      .values({
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
      })
      .returning();

    const [storeBakery] = await db
      .insert(schema.stores)
      .values({
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
      })
      .returning();

    // 5. Членство у магазинах (Store Members)
    console.info('👥 Привʼязка власників до магазинів (store_members)...');
    await db.insert(schema.storeMembers).values([
      {
        storeId: storeCoffee.id,
        userId: coffeeOwner.id,
        role: 'owner'
      },
      {
        storeId: storeTech.id,
        userId: techOwner.id,
        role: 'owner'
      },
      {
        storeId: storeBakery.id,
        userId: bakeryOwner.id,
        role: 'owner'
      }
    ]);

    // 6. Категорії товарів
    console.info('📑 Створення категорій товарів...');
    const [pCatCoffeeBeans] = await db
      .insert(schema.productCategories)
      .values({
        storeId: storeCoffee.id,
        name: 'Зернова кава',
        sortOrder: 1
      })
      .returning();

    const [pCatCoffeeDesserts] = await db
      .insert(schema.productCategories)
      .values({
        storeId: storeCoffee.id,
        name: 'Десерти та випічка',
        sortOrder: 2
      })
      .returning();

    const [pCatTechAccessories] = await db
      .insert(schema.productCategories)
      .values({
        storeId: storeTech.id,
        name: 'Периферія та аксесуари',
        sortOrder: 1
      })
      .returning();

    const [pCatBakeryBread] = await db
      .insert(schema.productCategories)
      .values({
        storeId: storeBakery.id,
        name: 'Хліб на заквасці',
        sortOrder: 1
      })
      .returning();

    // 6. Товари з фотографіями в Cloudflare R2
    console.info('📦 Створення товарів...');
    const [prodCoffee1] = await db
      .insert(schema.products)
      .values({
        storeId: storeCoffee.id,
        categoryId: pCatCoffeeBeans.id,
        name: 'Арабіка Ефіопія Їргачиф (250г)',
        sku: 'COF-ETH-250',
        description:
          'Яскравий квітковий аромат з нотами бергамоту, жасмину та цитрусових фруктів. Свіже обсмаження.',
        price: 38000, // 380.00 грн
        oldPrice: 42000,
        imageUrl: prodCoffee1Url,
        inventoryCount: 45,
        isActive: true
      })
      .returning();

    await db.insert(schema.products).values({
      storeId: storeCoffee.id,
      categoryId: pCatCoffeeBeans.id,
      name: 'Фірмовий Бленд «Львівський Ранок» (1кг)',
      sku: 'COF-LVIV-1KG',
      description:
        'Збалансований бленд з шоколадно-горіховим смаком та оксамитовою пінкою крема. Ідеально для еспресо.',
      price: 85000, // 850.00 грн
      oldPrice: 95000,
      imageUrl: prodCoffee2Url,
      inventoryCount: 30,
      isActive: true
    });

    const [prodCoffeeDessert] = await db
      .insert(schema.products)
      .values({
        storeId: storeCoffee.id,
        categoryId: pCatCoffeeDesserts.id,
        name: 'Львівський сирник з шоколадною глазурʼю',
        sku: 'DES-SYRNYK',
        description:
          'Класичний ніжний сирник з родзинками за автентичним галицьким рецептом, вкритий чорним шоколадом.',
        price: 13500, // 135.00 грн
        oldPrice: null,
        imageUrl: prodCoffeeDessertUrl,
        inventoryCount: 20,
        isActive: true
      })
      .returning();

    const [prodTech1] = await db
      .insert(schema.products)
      .values({
        storeId: storeTech.id,
        categoryId: pCatTechAccessories.id,
        name: 'Бездротові навушники CyberPods Pro ANC',
        sku: 'TECH-PODS-PRO',
        description:
          'Активне шумозаглушення (ANC), до 36 годин роботи з кейсом, підтримка швидкої бездротової зарядки.',
        price: 249900, // 2499.00 грн
        oldPrice: 289900,
        imageUrl: prodTech1Url,
        inventoryCount: 15,
        isActive: true
      })
      .returning();

    await db.insert(schema.products).values({
      storeId: storeTech.id,
      categoryId: pCatTechAccessories.id,
      name: 'Механічна клавіатура CyberKey RGB (Linear Red)',
      sku: 'TECH-KEY-RGB',
      description:
        'Компактний формат 75%, тихі лінійні перемикачі, гаряча заміна (Hot-Swap) та PBT-ковпачки з укр. гравіюванням.',
      price: 329900, // 3299.00 грн
      oldPrice: 360000,
      imageUrl: prodTech2Url,
      inventoryCount: 12,
      isActive: true
    });

    const [prodBread1] = await db
      .insert(schema.products)
      .values({
        storeId: storeBakery.id,
        categoryId: pCatBakeryBread.id,
        name: 'Хліб тартин на пшеничній заквасці (550г)',
        sku: 'BRD-TARTIN',
        description:
          'Хрустка скоринка та пористий ніжний мʼякуш з легкою кислинкою. Випікається у подовій печі.',
        price: 6800, // 68.00 грн
        oldPrice: null,
        imageUrl: prodBread1Url,
        inventoryCount: 25,
        isActive: true
      })
      .returning();

    const [prodBread2] = await db
      .insert(schema.products)
      .values({
        storeId: storeBakery.id,
        categoryId: pCatBakeryBread.id,
        name: 'Французький круасан з мигдалевим кремом',
        sku: 'BRD-CROISSANT-ALM',
        description:
          'Багатошарове листкове тісто на вершковому маслі 82% з ніжною мигдалевою начинкою франжипан.',
        price: 9500, // 95.00 грн
        oldPrice: 11000,
        imageUrl: prodBread2Url,
        inventoryCount: 40,
        isActive: true
      })
      .returning();

    // 7. Тестові замовлення
    console.info('💳 Створення замовлень та позицій для аналітики...');
    const now = new Date();

    const [order1] = await db
      .insert(schema.orders)
      .values({
        orderNumber: 'ORD-2026-001',
        storeId: storeCoffee.id,
        customerId: clientUser.id,
        status: 'delivered',
        totalAmount: prodCoffee1.price + prodCoffeeDessert.price,
        deliveryAddress: 'м. Київ, вул. Саксаганського, 10, кв. 24',
        contactPhone: clientUser.phone || '+380991239876',
        contactName: clientUser.name,
        paymentStatus: 'paid',
        paymentMethod: 'card',
        notes: 'Домофон 24, залишити біля дверей якщо не відповім',
        createdAt: now,
        updatedAt: now
      })
      .returning();

    await db.insert(schema.orderItems).values([
      {
        orderId: order1.id,
        productId: prodCoffee1.id,
        productName: prodCoffee1.name,
        unitPrice: prodCoffee1.price,
        quantity: 1,
        totalPrice: prodCoffee1.price,
        createdAt: now
      },
      {
        orderId: order1.id,
        productId: prodCoffeeDessert.id,
        productName: prodCoffeeDessert.name,
        unitPrice: prodCoffeeDessert.price,
        quantity: 1,
        totalPrice: prodCoffeeDessert.price,
        createdAt: now
      }
    ]);

    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const [order2] = await db
      .insert(schema.orders)
      .values({
        orderNumber: 'ORD-2026-002',
        storeId: storeTech.id,
        customerId: clientUser.id,
        status: 'shipped',
        totalAmount: prodTech1.price,
        deliveryAddress: 'м. Київ, Нова Пошта Відділення №45',
        contactPhone: clientUser.phone || '+380991239876',
        contactName: clientUser.name,
        paymentStatus: 'paid',
        paymentMethod: 'online',
        notes: 'Швидка доставка',
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo
      })
      .returning();

    await db.insert(schema.orderItems).values({
      orderId: order2.id,
      productId: prodTech1.id,
      productName: prodTech1.name,
      unitPrice: prodTech1.price,
      quantity: 1,
      totalPrice: prodTech1.price,
      createdAt: threeDaysAgo
    });

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [order3] = await db
      .insert(schema.orders)
      .values({
        orderNumber: 'ORD-2026-003',
        storeId: storeBakery.id,
        customerId: clientUser.id,
        status: 'delivered',
        totalAmount: prodBread1.price * 2 + prodBread2.price * 2,
        deliveryAddress: 'м. Київ, вул. Антоновича, 55',
        contactPhone: clientUser.phone || '+380991239876',
        contactName: clientUser.name,
        paymentStatus: 'paid',
        paymentMethod: 'card',
        createdAt: sevenDaysAgo,
        updatedAt: sevenDaysAgo
      })
      .returning();

    await db.insert(schema.orderItems).values([
      {
        orderId: order3.id,
        productId: prodBread1.id,
        productName: prodBread1.name,
        unitPrice: prodBread1.price,
        quantity: 2,
        totalPrice: prodBread1.price * 2,
        createdAt: sevenDaysAgo
      },
      {
        orderId: order3.id,
        productId: prodBread2.id,
        productName: prodBread2.name,
        unitPrice: prodBread2.price,
        quantity: 2,
        totalPrice: prodBread2.price * 2,
        createdAt: sevenDaysAgo
      }
    ]);

    console.info('✅ Наповнення тестовими даними успішно завершено!');
    console.info(`
══════════════════════════════════════════════════════════════════════════
 🚀 Тестові акаунти для входу (пароль для всіх: password123):
 ──────────────────────────────────────────────────────────────────────
 • Адміністратор:          admin@bizx.ua (роль: admin)
 • Власник кав'ярні:       owner.coffee@bizx.ua (роль: business_owner)
 • Власниця електроніки:   owner.tech@bizx.ua (роль: business_owner)
 • Власник пекарні:        owner.bakery@bizx.ua (роль: business_owner)
 • Клієнт:                 client@bizx.ua (роль: client, дефолтна аватарка)

 ☁️ Медіафайли завантажено у Cloudflare R2:
 • Аватарки:               /storage/file/avatars/*.svg
 • Логотипи магазинів:     /storage/file/stores/logos/*.svg
 • Банери магазинів:       /storage/file/stores/banners/*.svg
 • Зображення товарів:     /storage/file/products/*.svg
 • Статична заглушка:      /storage/defaults/avatar.svg
══════════════════════════════════════════════════════════════════════════
    `);
  } catch (error) {
    console.error('❌ Помилка під час наповнення тестовими даними:', error);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

seed();
