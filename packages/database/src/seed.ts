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

async function seed() {
  console.info('🌱 Початок наповнення бази даних тестовими даними (seeds)...');

  try {
    // 1. Очищуємо таблиці перед заповненням (ідемпотентність)
    console.info('🧹 Очищення існуючих тестових даних...');
    await db.execute(sql`
      TRUNCATE TABLE 
        order_items,
        orders,
        products,
        product_categories,
        stores,
        store_categories,
        refresh_tokens,
        users
      CASCADE;
    `);

    // 2. Користувачі (Users)
    console.info('👤 Створення користувачів...');
    await db.insert(schema.users).values({
      email: 'admin@bizx.ua',
      name: 'Олександр Коваленко',
      passwordHash: PASSWORD_HASH,
      role: 'admin',
      phone: '+380501234567',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
    });

    const [coffeeOwner] = await db
      .insert(schema.users)
      .values({
        email: 'owner.coffee@bizx.ua',
        name: 'Тарас Шевчук',
        passwordHash: PASSWORD_HASH,
        role: 'business_owner',
        phone: '+380671112233',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'
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
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9'
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
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e'
      })
      .returning();

    const [clientUser] = await db
      .insert(schema.users)
      .values({
        email: 'client@bizx.ua',
        name: 'Марія Бондаренко',
        passwordHash: PASSWORD_HASH,
        role: 'client',
        phone: '+380991239876',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
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

    // 4. Магазини (Stores)
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
        logoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300',
        bannerUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200',
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
        logoUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=300',
        bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
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
        logoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300',
        bannerUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200',
        address: 'м. Київ, вул. Велика Васильківська, 42',
        phone: '+380445556677',
        email: 'order@khlibna.ua',
        status: 'active'
      })
      .returning();

    // 5. Категорії товарів всередині магазинів (Product Categories)
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

    // 6. Товари (Products) — ціни в копійках (1 грн = 100 коп)
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
        imageUrl: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=500',
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
      imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500',
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
        imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500',
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
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
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
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
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
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
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
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500',
        inventoryCount: 40,
        isActive: true
      })
      .returning();

    // 7. Тестові замовлення (Orders + Order Items) за різні дати (для красивих графіків аналітики)
    console.info('💳 Створення замовлень та позицій для аналітики...');
    const now = new Date();

    // Замовлення 1: сьогодні (кав'ярня)
    const [order1] = await db
      .insert(schema.orders)
      .values({
        orderNumber: 'ORD-2026-001',
        storeId: storeCoffee.id,
        customerId: clientUser.id,
        status: 'delivered',
        totalAmount: prodCoffee1.price + prodCoffeeDessert.price, // 380 + 135 = 515 грн
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

    // Замовлення 2: 3 дні тому (техніка)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const [order2] = await db
      .insert(schema.orders)
      .values({
        orderNumber: 'ORD-2026-002',
        storeId: storeTech.id,
        customerId: clientUser.id,
        status: 'shipped',
        totalAmount: prodTech1.price, // 2499 грн
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

    // Замовлення 3: 7 днів тому (пекарня)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [order3] = await db
      .insert(schema.orders)
      .values({
        orderNumber: 'ORD-2026-003',
        storeId: storeBakery.id,
        customerId: clientUser.id,
        status: 'delivered',
        totalAmount: prodBread1.price * 2 + prodBread2.price * 2, // (68*2) + (95*2) = 326 грн
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
 • Клієнт:                 client@bizx.ua (роль: client)

 🏬 Створені магазини:
 • «Львівська Кавова Мануфактура» (slug: lviv-coffee-factory)
 • «CyberTech Ukraine»           (slug: cybertech-ua)
 • «Хлібна Майстерня»            (slug: khlibna-maisternia)
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
