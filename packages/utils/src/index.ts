export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toISOString();
}

export function createLogger(serviceName: string) {
  return {
    info: (msg: string, ...args: unknown[]) => {
      console.info(`[${new Date().toISOString()}] [INFO] [${serviceName}] ${msg}`, ...args);
    },
    error: (msg: string, ...args: unknown[]) => {
      console.error(`[${new Date().toISOString()}] [ERROR] [${serviceName}] ${msg}`, ...args);
    },
    warn: (msg: string, ...args: unknown[]) => {
      console.warn(`[${new Date().toISOString()}] [WARN] [${serviceName}] ${msg}`, ...args);
    }
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ==========================================
 * BIZX I18N SYSTEM (LIGHTWEIGHT LOCALIZATION)
 * ==========================================
 */

export type SupportedLocale = 'uk' | 'en';
export type TranslationDictionary = Record<string, unknown>;
export type InterpolationParams = Record<string, string | number>;

export interface I18nConfig {
  defaultLocale?: SupportedLocale;
  fallbackLocale?: SupportedLocale;
  translations?: Record<SupportedLocale, TranslationDictionary>;
}

export const SUPPORTED_LANGUAGES: {
  code: SupportedLocale;
  label: string;
  shortLabel: string;
  flag: string;
}[] = [
  { code: 'uk', label: 'Українська', shortLabel: 'UA', flag: '🇺🇦' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' }
];

export const uk = {
  common: {
    save: 'Зберегти',
    saving: 'Збереження...',
    cancel: 'Скасувати',
    edit: 'Редагувати',
    delete: 'Видалити',
    archive: 'Архівувати',
    restore: 'Відновити',
    back: 'Назад',
    close: 'Закрити',
    search: 'Пошук...',
    loading: 'Завантаження...',
    error: 'Помилка',
    success: 'Успішно',
    refresh: 'Оновити',
    actions: 'Дії',
    details: 'Деталі',
    yes: 'Так',
    no: 'Ні',
    logout: 'Вийти з акаунту',
    login: 'Увійти',
    register: 'Реєстрація',
    optional: "необов'язково",
    required: "обов'язково",
    all: 'Всі',
    confirm: 'Підтвердити',
    apply: 'Застосувати',
    reset: 'Скинути',
    days: 'днів',
    daysShort: 'дн.',
    uah: 'грн',
    pcs: 'шт.',
    ordersShort: 'зам.',
    soon: 'Скоро',
    create: 'Створити',
    add: 'Додати',
    export: 'Експорт',
    noData: 'Дані відсутні',
    unknownError: 'Сталася невідома помилка',
    user: 'Користувач',
    partner: 'Партнер',
    active: 'Активний',
    inactive: 'Неактивний',
    status: 'Статус',
    date: 'Дата',
    total: 'Всього',
    name: 'Назва',
    description: 'Опис',
    category: 'Категорія',
    price: 'Ціна',
    quantity: 'Кількість'
  },
  nav: {
    home: 'Головна',
    features: 'Можливості',
    forBusiness: 'Для бізнесу',
    forPartners: 'Для партнерів',
    howItWorks: 'Як це працює',
    contacts: 'Контакти',
    catalog: 'Каталог закладів',
    pricing: 'Тарифи',
    account: 'Мій кабінет',
    businessAdmin: 'Панель бізнесу',
    platformAdmin: 'BizX Panel',
    mainPortal: 'Головний портал',
    orders: 'Замовлення',
    cart: 'Кошик',
    profile: 'Профіль',
    settings: 'Налаштування',
    accountSettings: 'Налаштування акаунту',
    stores: 'Заклади'
  },
  roles: {
    platformAdmin: 'BizX Staff',
    businessPartner: 'Бізнес-партнер',
    client: 'Покупець',
    owner: 'Власник',
    manager: 'Менеджер',
    staff: 'Співробітник',
    user: 'Користувач'
  },
  statuses: {
    order: {
      pending: 'Очікує',
      paid: 'Оплачено',
      confirmed: 'Підтверджено',
      processing: 'Комплектується',
      shipped: 'В дорозі',
      delivered: 'Доставлено',
      cancelled: 'Скасовано'
    },
    payment: {
      pending: 'Очікує оплати',
      paid: 'Оплачено',
      failed: 'Помилка оплати',
      refunded: 'Повернено'
    },
    store: {
      draft: 'Чернетка',
      pending: 'На перевірці',
      active: 'Активний',
      suspended: 'Призупинений',
      closed: 'Закритий',
      archived: 'В архіві'
    },
    user: {
      active: 'Активний',
      suspended: 'Заблокований',
      archived: 'В архіві'
    }
  },
  auth: {
    signIn: 'Увійти до акаунту',
    signUp: 'Створити акаунт',
    signInTitle: 'Вхід у BizX ID',
    signUpTitle: 'Реєстрація у BizX',
    email: 'Електронна пошта',
    phone: 'Номер телефону',
    loginByEmail: 'Email',
    loginByPhone: 'Телефон',
    password: 'Пароль',
    confirmPassword: 'Підтвердження паролю',
    fullName: "Повне ім'я",
    haveAccount: 'Вже маєте обліковий запис?',
    noAccount: 'Ще не маєте облікового запису?',
    clientRole: 'Покупець',
    businessRole: 'Власник бізнесу',
    logoutConfirm: 'Ви дійсно бажаєте вийти з облікового запису?',
    invalidCredentials: 'Невірний логін або пароль',
    accessForbidden: 'Доступ до розділу обмежено',
    loginSuccess: 'Успішний вхід',
    registerSuccess: 'Акаунт успішно зареєстровано',
    loginError: 'Невірні облікові дані або помилка авторизації',
    registerError: 'Помилка при реєстрації акаунту',
    merchantSubtitle: 'Увійдіть у свій обліковий запис бізнес-партнера',
    merchantRegisterLink: 'Немає акаунту? Зареєструватися на порталі BizX',
    merchantNotice: 'Для доступу до панелі управління бізнесом потрібна активна бізнес-підписка',
    platformSubtitle: 'Вхід виключно для адміністраторів платформи BizX',
    platformNotice: 'Спроби несанкціонованого доступу логуються системою безпеки',
    staffOnlyError: 'Доступ дозволено лише співробітникам платформи BizX'
  },
  errors: {
    invalidCredentials: 'Невірний email, номер телефону або пароль',
    emailExists: 'Користувач із такою електронною поштою вже зареєстрований',
    phoneExists: 'Користувач із таким номером телефону вже зареєстрований',
    invalidPhone: 'Введіть коректний номер телефону',
    invalidEmail: 'Введіть коректну електронну пошту',
    userNotFound: 'Користувача не знайдено',
    unauthorized: 'Потрібна авторизація. Увійдіть у систему повторно',
    forbidden: 'У вас недостатньо прав для виконання цієї дії',
    networkError: "Помилка з'єднання із сервером. Спробуйте пізніше",
    saveFailed: 'Не вдалося зберегти зміни',
    loadFailed: 'Не вдалося завантажити дані',
    uploadFailed: 'Помилка завантаження файлу'
  },
  landing: {
    badge: 'Єдина SaaS-платформа для малого та середнього бізнесу',
    heroTitle: 'Цифрова інфраструктура для вашого бізнесу та лояльних клієнтів',
    heroSubtitle:
      'Запустіть власну цифрову вітрину, керуйте каталогом, приймайте онлайн-замовлення та аналізуйте продажі в єдиній екосистемі BizX.',
    ctaStart: 'Створити акаунт безкоштовно',
    ctaPortal: 'Перейти в кабінет',
    ctaPricing: 'Переглянути тарифи',
    ctaPartner: 'Панель бізнесу',
    statsStores: 'Активних закладів',
    statsUptime: 'Стабільність роботи',
    statsCommission: 'Комісія платформи',
    statsSetup: 'Швидкий запуск',
    featuresTag: 'МОЖЛИВОСТІ ПЛАТФОРМИ',
    featuresTitle: 'Все необхідне для сучасного бізнесу в одній системі',
    featuresSubtitle:
      'Від мобільного каталогу для покупців до професійної аналітики та керування командою для власників.',
    feature1Title: 'Єдина вітрина в мобільному додатку',
    feature1Desc: 'Ваші товари та послуги миттєво з’являються у додатку BizX для тисяч локальних покупців.',
    feature2Title: 'Керування замовленнями в реальному часі',
    feature2Desc: 'Отримуйте сповіщення, змінюйте статуси доставки та оплати за один клік.',
    feature3Title: 'Глибока аналітика та звіти',
    feature3Desc: 'Графіки продажів, середній чек, топ-товари та експорт звітів у Excel і CSV.',
    feature4Title: 'Ролі та права команди',
    feature4Desc: 'Додавайте менеджерів і персонал з гнучким розподілом прав доступу до закладу.',
    feature5Title: 'Швидке завантаження медіа',
    feature5Desc: 'Миттєве завантаження логотипів, банерів та фото товарів у високій якості.',
    feature6Title: 'Безпечна авторизація BizX ID',
    feature6Desc: 'Єдиний обліковий запис для всіх сервісів платформи з входом за Email або телефоном.',
    benefitsTag: 'ДЛЯ БІЗНЕСУ',
    benefitsTitle: 'Створено для швидкого масштабування без технічних бар’єрів',
    benefitsSubtitle:
      'Забудьте про дорогу розробку власних сайтів і додатків. Підключайте заклад за 5 хвилин і фокусуйтесь на клієнтах.',
    benefit1: 'Готовий кабінет мерчанта для керування всіма точками мережі',
    benefit2: 'Прозорі тарифи без прихованих відсотків з кожного замовлення',
    benefit3: 'Детальна аналітика та експорт даних у зручному форматі',
    benefit4: 'Миттєва синхронізація меню, цін і залишків у мобільному додатку',
    processTag: 'ЯК ЦЕ ПРАЦЮЄ',
    processTitle: '4 простих кроки до перших онлайн-продажів',
    step1Title: 'Реєстрація BizX ID',
    step1Desc: 'Створіть обліковий запис за email або номером телефону за 30 секунд.',
    step2Title: 'Вибір бізнес-тарифу',
    step2Desc: 'Оберіть план відповідно до кількості ваших торгових точок.',
    step3Title: 'Налаштування закладу',
    step3Desc: 'Додайте опис, логотип, товари та надішліть заклад на швидку модерацію.',
    step4Title: 'Прийом замовлень',
    step4Desc: 'Керуйте замовленнями, командою та відстежуйте зростання виторгу.',
    contactsTag: 'КОНТАКТИ ТА ПІДТРИМКА',
    contactsTitle: 'Готові підключити свій бізнес до BizX?',
    contactsSubtitle:
      'Наша команда підтримки допоможе з перенесенням каталогу та налаштуванням першого закладу.',
    footerRights: 'Усі права захищено.',
    footerProduct: 'Продукт',
    footerServices: 'Сервіси',
    footerSupport: 'Підтримка'
  },
  account: {
    title: 'Особистий кабінет BizX',
    subtitle: 'Керування профілем, бізнесами, підписками та налаштуваннями акаунту',
    profileTab: 'Особисті дані',
    profileTabDesc: "Ім'я, контакти та аватар",
    businessesTab: 'Мої бізнеси та ролі',
    businessesTabDesc: 'Заклади та права доступу',
    subscriptionsTab: 'Підписка та тарифи',
    subscriptionsTabDesc: 'Статус, дні дії та плани',
    securityTab: 'Безпека та пароль',
    securityTabDesc: 'Пароль, 2FA та сесії',
    privacyTab: 'Сповіщення та приватність',
    privacyTabDesc: 'Email, SMS та маркетинг',
    integrationsTab: 'Інтеграції та API',
    integrationsTabDesc: 'CRM, вебхуки та ключі',
    language: 'Мова інтерфейсу',
    languageDesc: 'Оберіть бажану мову інтерфейсу для всіх сервісів платформи',
    selectLanguage: 'Вибір мови',
    ukrainian: 'Українська',
    english: 'English',
    languageUpdated: 'Мову інтерфейсу успішно оновлено',
    saveChanges: 'Зберегти зміни',
    personalInfo: 'Персональна інформація',
    avatar: 'Фото профілю (аватар)',
    avatarUploadSuccess: 'Аватарку успішно оновлено',
    profileUpdated: 'Особисті дані успішно збережено',
    phoneHint: 'Використовується для входу в акаунт та зв’язку щодо замовлень',
    emailReadonlyHint: 'Електронна пошта є основним ідентифікатором BizX ID',
    myStoresTitle: 'Мої торгові заклади',
    createStore: 'Створити заклад',
    noStoresYet: 'У вас поки немає створених закладів',
    createFirstStoreHint: 'Оформіть бізнес-підписку та створіть свій перший заклад для початку продажів.',
    openMerchantPanel: 'Відкрити панель бізнесу',
    submitForModeration: 'Надіслати на модерацію',
    storeCreated: 'Заклад успішно створено як чернетку',
    storeSubmitted: 'Заклад відправлено на модерацію',
    storeNameLabel: 'Назва закладу',
    storeSlugLabel: 'Адреса сторінки (URL)',
    storeAddressLabel: 'Адреса закладу',
    storePhoneLabel: 'Контактний телефон',
    storeDescLabel: 'Короткий опис',
    authRequiredTitle: 'Потрібна авторизація',
    authRequiredDesc: 'Увійдіть у свій обліковий запис BizX ID, щоб переглянути налаштування кабінету.',
    inDevelopment: 'Розділ у розробці',
    securityComingSoon: 'Зміна паролю, двофакторна автентифікація та журнал активних сесій з’являться найближчим часом.',
    privacyComingSoon: 'Тонке налаштування email/SMS сповіщень та маркетингових розсилок з’явиться найближчим часом.',
    integrationsComingSoon: 'API-ключі, вебхуки та інтеграція з популярними CRM з’являться найближчим часом.'
  },
  pricing: {
    title: 'Тарифи та плани BizX',
    subtitle: 'Прозорі умови для покупців та ефективні інструменти зростання для бізнесу.',
    forBusiness: 'Для бізнесу',
    forClients: 'Для покупців',
    perMonth: 'на місяць',
    free: 'Безкоштовно',
    popular: 'Найпопулярніший',
    currentPlan: 'Ваш поточний план',
    upgradePlan: 'Перейти на тариф',
    activate30Days: 'Підключити на 30 днів',
    loginToSubscribe: 'Увійдіть, щоб підключити',
    noCardNeeded: 'Банківська картка не потрібна. Миттєве підключення тарифу на 30 днів.',
    subscribeSuccess: 'Тариф успішно активовано на 30 днів!',
    subscribeError: 'Не вдалося активувати тарифний план',
    faqTitle: 'Часті запитання про тарифи',
    faq1Q: 'Чи можна змінити тарифний план пізніше?',
    faq1A: 'Так, ви можете підвищити або змінити тариф у будь-який момент в особистому кабінеті.',
    faq2Q: 'Що станеться, якщо кількість закладів перевищить ліміт тарифу?',
    faq2A: 'Зайві заклади не видаляються — ви зможете обрати, які заклади залишити активними, а які призупинити.',
    faq3Q: 'Чи бере BizX комісію з продажів?',
    faq3A: 'Ні, ви сплачуєте лише фіксовану щомісячну підписку без прихованих відсотків.'
  },
  subscriptions: {
    currentPlan: 'Поточний тарифний план',
    status: 'Статус підписки',
    activeStatus: 'Активна',
    expiredStatus: 'Закінчилась',
    noneStatus: 'Не підключена',
    daysLeft: 'Днів залишилося: {count}',
    daysRemainingLabel: 'Залишилось днів:',
    storesLimit: 'Ліміт активних закладів: {active} з {max}',
    limitExceeded: 'Увага! Кількість ваших активних закладів перевищує ліміт нового тарифу.',
    expiringSoon: 'Увага: підписка закінчується незабаром. Продовжте тариф у кабінеті BizX.',
    suspendStore: 'Призупинити',
    activateStore: 'Активувати',
    needBusinessSub: 'Для доступу до панелі управління бізнесом потрібна активна бізнес-підписка',
    goToPricing: 'Обрати бізнес-тариф'
  },
  admin: {
    merchantTitle: 'BizX Merchant | Керування бізнесом',
    platformTitle: 'BizX Panel | Платформа',
    storeLabel: 'Магазин',
    selectStore: 'Оберіть магазин',
    noStores: 'Немає магазинів',
    storePanel: 'Панель закладу',
    overview: 'Огляд',
    dashboard: 'Дашборд',
    analytics: 'Аналітика',
    detailedAnalytics: 'Детальна аналітика',
    products: 'Товари та меню',
    orders: 'Замовлення',
    marketing: 'Маркетинг і розсилки',
    customers: 'Клієнти',
    staff: 'Команда',
    roles: 'Ролі та доступи',
    rolesTitle: 'Ролі та доступи закладу',
    rolesSubtitle: 'Налаштовуйте ієрархію ролей та гнучкі права доступу для працівників',
    settings: 'Налаштування закладу',
    payouts: 'Виплати',
    payoutsTitle: 'Фінанси та виплати',
    payoutsDesc: 'Автоматичне перерахування коштів від продажів на розрахунковий рахунок (IBAN)',
    tariffPlan: 'Тарифний план',
    profileInBizx: 'Профіль у BizX',
    manageAccountTitle: 'Керувати акаунтом у BizX Portal',
    totalRevenue: 'Загальна виручка',
    successfulPayments: 'Успішні оплати',
    totalOrders: 'Всього замовлень',
    processedBySystem: 'Оброблено системою',
    averageOrderValue: 'Середній чек',
    perOrder: 'На одне замовлення',
    activeProducts: 'Активні товари',
    inStoreCatalog: 'В каталозі магазину',
    activeOrders: 'Активні замовлення',
    totalCustomers: 'Клієнти',
    totalStores: 'Заклади мережі',
    selectStoreForAnalytics: 'Оберіть або створіть магазин для перегляду аналітики',
    overviewTitle: 'Огляд показників продажів',
    overviewSubtitle: 'Зведені дані для магазину «{name}»',
    statusBreakdown: 'Розподіл за статусами замовлень',
    noStatusData: 'Немає даних по статусах',
    salesDynamics: 'Динаміка продажів',
    noPeriodData: 'Дані за поточний період відсутні',
    topProductsTitle: 'Топ-10 найпопулярніших товарів за виручкою',
    noTopProducts: 'Топ-товари поки відсутні',
    productCol: 'Товар',
    soldQtyCol: 'Продано шт.',
    revenueCol: 'Виручка',
    openDetailedAnalytics: 'Детальна аналітика та експорт'
  },
  analytics: {
    title: 'Детальна аналітика та звіти',
    subtitle: 'Глибока статистика, фільтрація показників, візуалізація графіків та експорт даних',
    platformSubtitle: 'Детальна аналітика по всій платформі BizX з фільтрами та експортом звітів',
    filters: 'Фільтри',
    period: 'Період',
    periodDay: 'За добу',
    periodWeek: 'За 7 днів',
    periodMonth: 'За 30 днів',
    periodYear: 'За рік',
    periodAll: 'Весь час',
    dateFrom: 'Дата від',
    dateTo: 'Дата до',
    orderStatus: 'Статус замовлення',
    allStatuses: 'Усі статуси',
    storeFilter: 'Заклад',
    allStores: 'Усі заклади',
    minAmount: 'Мін. сума (₴)',
    maxAmount: 'Макс. сума (₴)',
    minOrders: 'Мін. замовлень',
    minQty: 'Мін. кількість',
    applyFilters: 'Застосувати',
    resetFilters: 'Скинути',
    exportCsv: 'Експорт CSV',
    exportExcel: 'Експорт Excel (.xlsx)',
    exportSuccess: 'Звіт успішно експортовано',
    revenueOverTime: 'Динаміка виторгу та замовлень у часі',
    revenueOverTimeDesc: 'Лінійний графік зміни виторгу (₴) та кількості замовлень по днях',
    monthlyComparison: 'Показники по місяцях',
    monthlyComparisonDesc: 'Стовпчикова діаграма виторгу та обсягу замовлень за місяцями',
    statusDistribution: 'Розподіл замовлень за статусами',
    statusDistributionDesc: 'Стовпчикова діаграма кількості замовлень у кожному статусі',
    topProductsChart: 'Топ товарів за виручкою',
    topStoresChart: 'Топ закладів за оборотом',
    scatterTitle: 'Діаграма розсіювання: Кількість vs Виручка',
    scatterProductsDesc: 'Кореляція між обсягом проданих одиниць (вісь X) та виторгом товару (вісь Y)',
    scatterStoresDesc: 'Кореляція між кількістю замовлень (вісь X) та оборотом закладу (вісь Y)',
    revenueAxis: 'Виручка (₴)',
    ordersAxis: 'Замовлення',
    quantityAxis: 'Кількість (шт.)',
    tableTitle: 'Деталізована таблиця відфільтрованих даних',
    tabDaily: 'По днях',
    tabMonthly: 'По місяцях',
    tabProducts: 'Товари',
    tabStores: 'Заклади',
    recordsCount: 'Записів: {count}',
    noChartData: 'Недостатньо даних для побудови графіка за обраними фільтрами',
    shareOfRevenue: 'Частка виторгу',
    avgCheck: 'Середній чек',
    topLimitLabel: 'Показати:',
    topAll: 'Усі',
    rowsPerPage: 'Записів на сторінці:',
    showingRange: 'Показано {from}–{to} із {total}',
    pageOf: 'Стор. {page} з {pages}',
    prevPage: 'Назад',
    nextPage: 'Далі'
  },
  products: {
    title: 'Товари та каталог',
    subtitle: 'Керуйте асортиментом, цінами та залишками магазину',
    addProduct: 'Додати товар',
    editProduct: 'Редагувати товар',
    newProduct: 'Новий товар',
    searchPlaceholder: 'Пошук за назвою або SKU...',
    allCategories: 'Усі категорії',
    empty: 'Товарів поки немає',
    emptyHint: 'Додайте перший товар, щоб він з’явився у вітрині магазину.',
    nameLabel: 'Назва товару',
    skuLabel: 'Артикул (SKU)',
    priceLabel: 'Ціна (₴)',
    oldPriceLabel: 'Стара ціна (₴)',
    stockLabel: 'Залишок на складі',
    descriptionLabel: 'Опис товару',
    imageLabel: 'Зображення товару',
    isActiveLabel: 'Активний (видимий у каталозі)',
    inStock: 'В наявності: {count}',
    outOfStock: 'Немає в наявності',
    deleteConfirm: 'Архівувати цей товар?',
    created: 'Товар успішно додано',
    updated: 'Товар оновлено',
    deleted: 'Товар архівовано'
  },
  orders: {
    title: 'Замовлення клієнтів',
    subtitle: 'Відстежуйте та обробляйте вхідні замовлення в реальному часі',
    empty: 'Замовлень поки немає',
    orderNumber: 'Замовлення',
    customer: 'Клієнт',
    items: 'Позиції',
    amount: 'Сума',
    payment: 'Оплата',
    deliveryAddress: 'Адреса доставки',
    notes: 'Коментар',
    changeStatus: 'Змінити статус',
    statusUpdated: 'Статус замовлення оновлено'
  },
  staff: {
    title: 'Команда закладу',
    subtitle: 'Додавайте менеджерів та персонал для спільної роботи з магазином',
    addMember: 'Додати співробітника',
    emailPlaceholder: 'Email зареєстрованого користувача',
    roleLabel: 'Роль у закладі',
    empty: 'У команді поки немає інших співробітників',
    memberAdded: 'Співробітника успішно додано',
    memberRemoved: 'Співробітника видалено з команди',
    roleUpdated: 'Роль співробітника оновлено',
    removeConfirm: 'Видалити цього співробітника з команди закладу?'
  },
  storeSettings: {
    title: 'Налаштування закладу',
    subtitle: 'Основна інформація, контакти, логотип та банер магазину',
    generalInfo: 'Основні дані',
    mediaBranding: 'Логотип та банер',
    logo: 'Логотип закладу',
    banner: 'Банер вітрини',
    uploadLogo: 'Завантажити логотип',
    uploadBanner: 'Завантажити банер',
    saved: 'Налаштування закладу збережено'
  },
  platform: {
    consoleTitle: 'Консоль керування',
    quickLinks: 'Швидкі переходи',
    tabMetrics: 'Огляд та метрики',
    tabAnalytics: 'Детальна аналітика',
    tabBusinesses: 'Бізнеси',
    tabBusinessesAll: 'Усі бізнеси',
    tabBusinessesPending: 'Очікують підтвердження',
    tabUsers: 'Користувачі',
    tabDisputes: 'Скарги',
    tabCommunications: 'Комунікації',
    tabSupport: 'Звернення підтримки',
    tabBroadcasts: 'Розсилки BizX',
    tabStaff: 'Команда BizX',
    tabRoles: 'Ролі та доступи',
    rolesTitle: 'Ролі платформи BizX Core',
    rolesSubtitle: 'Ієрархія ролей та гранулярні права доступу для команди платформи BizX',
    operatorFallback: 'Оператор платформи',
    logoutTitle: 'Вийти з консолі',
    overviewBadge: 'Огляд платформи BizX',
    realtimeBadge: 'Режим реального часу',
    metricsTitle: 'Огляд та системні показники',
    metricsSubtitle: 'Зведений оборот торгівлі, стан підключених бізнесів та навантаження на систему',
    gmv: 'Загальний оборот',
    orders: 'Замовлення',
    processedByPlatform: 'Оброблено платформою',
    avgCheck: 'Середній чек',
    acrossAllStores: 'По всіх закладах',
    stores: 'Заклади',
    activeCount: '{count} активних',
    products: 'Товари',
    inBusinessCatalogs: 'В каталогах бізнесу',
    users: 'Користувачі',
    bizxIdAccounts: 'BizX ID акаунтів',
    topStoresTitle: 'Лідери торгівлі за виручкою',
    topStoresSubtitle: 'Підключені бізнеси з найбільшим оборотом продажів у системі',
    topCount: 'Топ {count}',
    noRevenueData: 'Дані по виручці формуються на основі сплачених замовлень',
    storeCol: 'Торгова точка',
    ordersCol: 'Замовлень',
    revenueCol: 'Виручка',
    shareCol: 'Частка обороту',
    infraTitle: 'Стан сервісів платформи',
    infraSubtitle: 'Поточний стан основних сервісів BizX',
    allSystemsOperational: 'Всі системи в нормі',
    storeStatusDist: 'Розподіл бізнесів за статусами',
    storeStatusSubtitle: 'Поточний стан підключених торгових закладів',
    activeStores: 'Активні магазини',
    pendingStores: 'Очікують перевірки',
    suspendedStores: 'Призупинені',
    archivedStores: 'Архівовані',
    moderationPolicy: 'Політика модерації',
    moderationPolicyDesc:
      'Співробітники BizX мають право змінювати статус активності закладів та блокувати підозрілі акаунти, але не редагують товари та ціни мерчантів.',
    businessesTitle: 'Управління торговими точками',
    businessesSubtitle: 'Модерація нових заявок, зміна статусів та перегляд деталей закладів',
    usersTitle: 'Реєстр користувачів BizX ID',
    usersSubtitle: 'Перегляд акаунтів, контактних даних, підписок та блокування порушників',
    staffTitle: 'Команда платформи BizX',
    staffSubtitle: 'Адміністратори системи з доступом до консолі управління'
  },
  mobile: {
    tabStores: 'Заклади',
    tabCart: 'Кошик',
    tabOrders: 'Замовлення',
    tabProfile: 'Профіль',
    emptyCart: 'Ваш кошик порожній',
    emptyCartHint: 'Оберіть товари в улюбленому закладі, щоб оформити замовлення',
    checkout: 'Оформити замовлення',
    orderPlaced: 'Замовлення оформлено!',
    systemLanguage: 'Системна мова пристрою (Авто)',
    customLanguage: 'Обрана мова додатку',
    languagePreference: 'Мова додатку',
    searchStores: 'Пошук закладів...',
    noStoresFound: 'Закладів не знайдено',
    noOrdersYet: 'У вас поки немає замовлень',
    addToCart: 'У кошик',
    addedToCart: 'Додано в кошик',
    deliveryAddress: 'Адреса доставки',
    contactName: "Контактне ім'я",
    contactPhone: 'Контактний телефон',
    orderNotes: 'Коментар до замовлення',
    totalToPay: 'До сплати',
    phoneSaved: 'Номер телефону збережено'
  },
  permissions: {
    products: {
      read: 'Перегляд товарів та категорій',
      write: 'Створення нових товарів та категорій',
      edit: 'Редагування даних, цін та фото товарів',
      status: 'Зміна статусу товару (Активний / Чернетка)',
      archive: 'Архівація (видалення) товарів та категорій'
    },
    orders: {
      read: 'Перегляд замовлень клієнтів',
      edit: 'Зміна статусів замовлень, оплати та чат із клієнтами',
      refund: 'Швидке повернення коштів клієнту'
    },
    analytics: {
      read: 'Перегляд дашборду та статистики продажів',
      export: 'Експорт аналітики в Excel / CSV'
    },
    store: {
      admin: 'Адміністратор (повний доступ, крім прав власника)',
      read: 'Перегляд даних та налаштувань закладу',
      edit: 'Редагування даних, логотипу та банера',
      status: {
        manage: 'Керування статусом закладу (пауза / модерація)'
      }
    },
    staff: {
      read: 'Перегляд списку працівників',
      write: 'Додавання нових працівників',
      edit: 'Зміна ролей та доступів працівників',
      archive: 'Архівація (видалення) працівників із команди'
    },
    roles: {
      read: 'Перегляд ролей та їх прав',
      write: 'Створення нових ролей',
      edit: 'Редагування ролей та зміна пріоритету',
      archive: 'Архівація (видалення) ролей'
    },
    marketing: {
      broadcasts: {
        read: 'Перегляд підписників, лімітів та історії розсилок закладу',
        send: 'Надсилання акційних розсилок та керування авто-знижками'
      }
    },
    platform: {
      admin: 'Адміністратор платформи (повний доступ з урахуванням ієрархії)',
      stores: {
        read: 'Перегляд усіх торгових точок платформи',
        moderate: 'Модерація та призупинення закладів',
        approve: 'Підтвердження та відхилення нових заявок бізнесів',
        unblock: 'Дострокове розблокування призупинених закладів',
        archive: 'Архівація (видалення) торгових точок'
      },
      categories: {
        manage: 'Керування категоріями закладів'
      },
      users: {
        read: 'Перегляд реєстру користувачів BizX ID',
        edit: 'Блокування облікових записів користувачів',
        unblock: 'Розблокування заблокованих користувачів',
        subscriptions: 'Перегляд та керування підписками користувачів',
        archive: 'Архівація облікових записів користувачів'
      },
      analytics: {
        read: 'Перегляд метрик та аналітики платформи',
        export: 'Експорт платформних звітів у Excel / CSV'
      },
      staff: {
        read: 'Перегляд команди платформи BizX',
        write: 'Додавання співробітників BizX',
        edit: 'Редагування ролей співробітників BizX',
        archive: 'Архівація (видалення) співробітників BizX'
      },
      roles: {
        read: 'Перегляд ролей платформи',
        write: 'Створення ролей платформи',
        edit: 'Редагування та пріоритет ролей платформи',
        archive: 'Архівація (видалення) ролей платформи'
      },
      disputes: {
        read: 'Перегляд скарг та листування по спорах',
        resolve: 'Розгляд скарг, повернення коштів та видача страйків'
      },
      strikes: {
        issue: 'Ручна видача страйків закладам через керування',
        revoke: 'Зняття страйків та дострокове розблокування закладів'
      },
      broadcasts: {
        read: 'Перегляд журналу офіційних та технічних розсилок BizX',
        send: 'Надсилання офіційних та технічних розсилок користувачам BizX'
      },
      support: {
        read: 'Перегляд звернень користувачів у службу підтримки BizX',
        reply: 'Відповіді користувачам у тікетах техпідтримки BizX'
      }
    }
  },
  permissionCategories: {
    admin: 'Адміністрування',
    products: 'Товари та каталог',
    orders: 'Замовлення',
    analytics: 'Статистика та аналітика',
    store: 'Налаштування закладу',
    staff: 'Команда та працівники',
    roles: 'Ролі та ієрархія',
    marketing: 'Маркетинг і розсилки',
    platform_admin: 'Адміністрування платформи',
    platform_stores: 'Торгові точки платформи',
    platform_users: 'Користувачі BizX ID',
    platform_analytics: 'Аналітика платформи',
    platform_staff: 'Команда BizX',
    platform_roles: 'Ролі платформи',
    platform_disputes: 'Скарги та страйки',
    platform_communications: 'Комунікації, розсилки та підтримка'
  },
  disputes: {
    categories: {
      not_received: 'Товар не прийшов',
      damaged: 'Товар пошкоджено або брак',
      wrong_item: 'Привезли не той товар',
      missing_items: 'Неповна комплектація',
      poor_quality: 'Низька якість товару / послуги',
      other: 'Інше (описати власноруч)'
    },
    statuses: {
      open_store: 'Відкрито спір',
      escalated_platform: 'На розгляді BizX',
      withdrawn: 'Відкликано клієнтом',
      resolved_refund: 'Повернення узгоджено',
      resolved_business: 'Закрито на користь бізнесу',
      resolved_customer: 'Закрито на користь клієнта'
    }
  },
  permissionActions: {
    read: 'Читання',
    write: 'Створення',
    edit: 'Редагування',
    manage: 'Керування',
    export: 'Експорт',
    archive: 'Архівація'
  }
};

export const en: typeof uk = {
  common: {
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    archive: 'Archive',
    restore: 'Restore',
    back: 'Back',
    close: 'Close',
    search: 'Search...',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    refresh: 'Refresh',
    actions: 'Actions',
    details: 'Details',
    yes: 'Yes',
    no: 'No',
    logout: 'Sign out',
    login: 'Sign in',
    register: 'Sign up',
    optional: 'optional',
    required: 'required',
    all: 'All',
    confirm: 'Confirm',
    apply: 'Apply',
    reset: 'Reset',
    days: 'days',
    daysShort: 'd.',
    uah: 'UAH',
    pcs: 'pcs',
    ordersShort: 'ord.',
    soon: 'Soon',
    create: 'Create',
    add: 'Add',
    export: 'Export',
    noData: 'No data available',
    unknownError: 'An unexpected error occurred',
    user: 'User',
    partner: 'Partner',
    active: 'Active',
    inactive: 'Inactive',
    status: 'Status',
    date: 'Date',
    total: 'Total',
    name: 'Name',
    description: 'Description',
    category: 'Category',
    price: 'Price',
    quantity: 'Quantity'
  },
  nav: {
    home: 'Home',
    features: 'Features',
    forBusiness: 'For Business',
    forPartners: 'For Partners',
    howItWorks: 'How it works',
    contacts: 'Contacts',
    catalog: 'Stores Catalog',
    pricing: 'Pricing',
    account: 'My Account',
    businessAdmin: 'Business Panel',
    platformAdmin: 'BizX Panel',
    mainPortal: 'Main Portal',
    orders: 'Orders',
    cart: 'Cart',
    profile: 'Profile',
    settings: 'Settings',
    accountSettings: 'Account Settings',
    stores: 'Stores'
  },
  roles: {
    platformAdmin: 'BizX Staff',
    businessPartner: 'Business Partner',
    client: 'Customer',
    owner: 'Owner',
    manager: 'Manager',
    staff: 'Staff',
    user: 'User'
  },
  statuses: {
    order: {
      pending: 'Pending',
      paid: 'Paid',
      confirmed: 'Confirmed',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    },
    payment: {
      pending: 'Awaiting payment',
      paid: 'Paid',
      failed: 'Payment failed',
      refunded: 'Refunded'
    },
    store: {
      draft: 'Draft',
      pending: 'Pending review',
      active: 'Active',
      suspended: 'Suspended',
      closed: 'Closed',
      archived: 'Archived'
    },
    user: {
      active: 'Active',
      suspended: 'Suspended',
      archived: 'Archived'
    }
  },
  auth: {
    signIn: 'Sign in to account',
    signUp: 'Create account',
    signInTitle: 'Sign in with BizX ID',
    signUpTitle: 'Register for BizX',
    email: 'Email address',
    phone: 'Phone number',
    loginByEmail: 'Email',
    loginByPhone: 'Phone',
    password: 'Password',
    confirmPassword: 'Confirm password',
    fullName: 'Full name',
    haveAccount: 'Already have an account?',
    noAccount: "Don't have an account yet?",
    clientRole: 'Customer',
    businessRole: 'Business Owner',
    logoutConfirm: 'Are you sure you want to sign out?',
    invalidCredentials: 'Invalid login or password',
    accessForbidden: 'Access restricted',
    loginSuccess: 'Successfully signed in',
    registerSuccess: 'Account successfully registered',
    loginError: 'Invalid credentials or authentication error',
    registerError: 'Failed to create account',
    merchantSubtitle: 'Sign in to your business partner account',
    merchantRegisterLink: "Don't have an account? Register on BizX Portal",
    merchantNotice: 'An active business subscription is required to access the Merchant Portal',
    platformSubtitle: 'Restricted access for BizX Platform administrators only',
    platformNotice: 'Unauthorized access attempts are logged by the security system',
    staffOnlyError: 'Access is restricted to BizX Platform staff members only'
  },
  errors: {
    invalidCredentials: 'Invalid email, phone number, or password',
    emailExists: 'An account with this email address already exists',
    phoneExists: 'An account with this phone number already exists',
    invalidPhone: 'Please enter a valid phone number',
    invalidEmail: 'Please enter a valid email address',
    userNotFound: 'User not found',
    unauthorized: 'Authorization required. Please sign in again',
    forbidden: 'You do not have permission to perform this action',
    networkError: 'Server connection error. Please try again later',
    saveFailed: 'Failed to save changes',
    loadFailed: 'Failed to load data',
    uploadFailed: 'Failed to upload file'
  },
  landing: {
    badge: 'Unified SaaS Platform for Small & Medium Businesses',
    heroTitle: 'Digital infrastructure for your business and loyal customers',
    heroSubtitle:
      'Launch your digital storefront, manage catalogs, accept online orders, and analyze sales in one unified BizX ecosystem.',
    ctaStart: 'Create free account',
    ctaPortal: 'Open account',
    ctaPricing: 'View pricing',
    ctaPartner: 'Business Panel',
    statsStores: 'Active stores',
    statsUptime: 'Platform uptime',
    statsCommission: 'Platform commission',
    statsSetup: 'Quick setup',
    featuresTag: 'PLATFORM FEATURES',
    featuresTitle: 'Everything a modern business needs in one system',
    featuresSubtitle:
      'From a mobile shopping catalog for customers to deep analytics and team management for owners.',
    feature1Title: 'Unified Mobile Storefront',
    feature1Desc: 'Your products and services instantly appear in the BizX app for thousands of local shoppers.',
    feature2Title: 'Real-time Order Management',
    feature2Desc: 'Receive instant updates and manage delivery and payment statuses in a single click.',
    feature3Title: 'Deep Analytics & Exports',
    feature3Desc: 'Sales charts, average order value, top products, and Excel/CSV report exports.',
    feature4Title: 'Team Roles & Permissions',
    feature4Desc: 'Invite managers and staff with flexible access controls for every store.',
    feature5Title: 'Fast Media Hosting',
    feature5Desc: 'Instant upload and crisp delivery for logos, banners, and product photos.',
    feature6Title: 'Secure BizX ID Auth',
    feature6Desc: 'Single sign-on across all platform services using Email or Phone number.',
    benefitsTag: 'FOR BUSINESS',
    benefitsTitle: 'Built to scale fast without technical barriers',
    benefitsSubtitle:
      'Skip expensive custom app development. Connect your store in 5 minutes and focus on your customers.',
    benefit1: 'Ready-to-use Merchant Portal to manage all your locations',
    benefit2: 'Transparent flat pricing with zero hidden per-order commissions',
    benefit3: 'Detailed analytics with one-click Excel & CSV exports',
    benefit4: 'Instant menu, pricing, and inventory sync to the mobile app',
    processTag: 'HOW IT WORKS',
    processTitle: '4 simple steps to your first online sales',
    step1Title: 'Create BizX ID',
    step1Desc: 'Register with your email or phone number in 30 seconds.',
    step2Title: 'Choose a Business Plan',
    step2Desc: 'Pick a plan that matches the number of your store locations.',
    step3Title: 'Configure Your Store',
    step3Desc: 'Add your description, logo, products, and submit for quick moderation.',
    step4Title: 'Accept Orders',
    step4Desc: 'Manage orders, your team, and track revenue growth in real time.',
    contactsTag: 'CONTACTS & SUPPORT',
    contactsTitle: 'Ready to connect your business to BizX?',
    contactsSubtitle:
      'Our support team will help you migrate your catalog and configure your first storefront.',
    footerRights: 'All rights reserved.',
    footerProduct: 'Product',
    footerServices: 'Services',
    footerSupport: 'Support'
  },
  account: {
    title: 'BizX Personal Account',
    subtitle: 'Manage your profile, businesses, subscriptions, and account preferences',
    profileTab: 'Personal Info',
    profileTabDesc: 'Name, contacts and avatar',
    businessesTab: 'My Businesses & Roles',
    businessesTabDesc: 'Stores and access rights',
    subscriptionsTab: 'Subscriptions & Plans',
    subscriptionsTabDesc: 'Status, active days and plans',
    securityTab: 'Security & Password',
    securityTabDesc: 'Password, 2FA and active sessions',
    privacyTab: 'Notifications & Privacy',
    privacyTabDesc: 'Email, SMS and marketing',
    integrationsTab: 'Integrations & API',
    integrationsTabDesc: 'CRM, webhooks and keys',
    language: 'Interface Language',
    languageDesc: 'Select your preferred language across all platform websites',
    selectLanguage: 'Choose language',
    ukrainian: 'Українська',
    english: 'English',
    languageUpdated: 'Interface language updated successfully',
    saveChanges: 'Save changes',
    personalInfo: 'Personal Information',
    avatar: 'Profile picture (avatar)',
    avatarUploadSuccess: 'Avatar updated successfully',
    profileUpdated: 'Personal information saved successfully',
    phoneHint: 'Used for phone sign-in and order notifications',
    emailReadonlyHint: 'Email address is your primary BizX ID identifier',
    myStoresTitle: 'My Stores',
    createStore: 'Create Store',
    noStoresYet: 'You have not created any stores yet',
    createFirstStoreHint: 'Activate a business plan and create your first store to start selling.',
    openMerchantPanel: 'Open Business Panel',
    submitForModeration: 'Submit for moderation',
    storeCreated: 'Store created as a draft',
    storeSubmitted: 'Store submitted for moderation',
    storeNameLabel: 'Store name',
    storeSlugLabel: 'Page web address (URL)',
    storeAddressLabel: 'Store address',
    storePhoneLabel: 'Contact phone',
    storeDescLabel: 'Short description',
    authRequiredTitle: 'Authorization required',
    authRequiredDesc: 'Sign in with your BizX ID to view and manage your account settings.',
    inDevelopment: 'Coming Soon',
    securityComingSoon: 'Password updates, two-factor authentication, and active session management are coming soon.',
    privacyComingSoon: 'Granular email/SMS notification and marketing preferences are coming soon.',
    integrationsComingSoon: 'API keys, webhooks, and CRM integrations are coming soon.'
  },
  pricing: {
    title: 'BizX Pricing & Plans',
    subtitle: 'Transparent terms for shoppers and powerful growth tools for businesses.',
    forBusiness: 'For Business',
    forClients: 'For Customers',
    perMonth: 'per month',
    free: 'Free',
    popular: 'Most Popular',
    currentPlan: 'Your current plan',
    upgradePlan: 'Upgrade plan',
    activate30Days: 'Activate for 30 days',
    loginToSubscribe: 'Sign in to subscribe',
    noCardNeeded: 'No credit card required. Instant 30-day plan activation.',
    subscribeSuccess: 'Plan successfully activated for 30 days!',
    subscribeError: 'Failed to activate subscription plan',
    faqTitle: 'Frequently Asked Questions',
    faq1Q: 'Can I change my plan later?',
    faq1A: 'Yes, you can upgrade or switch your plan at any time from your Personal Account.',
    faq2Q: 'What happens if my active stores exceed the new plan limit?',
    faq2A: 'Extra stores are never deleted — you can choose which stores to keep active and pause the rest.',
    faq3Q: 'Does BizX charge per-order commissions?',
    faq3A: 'No, you only pay a flat monthly subscription with zero hidden fees.'
  },
  subscriptions: {
    currentPlan: 'Current subscription plan',
    status: 'Subscription status',
    activeStatus: 'Active',
    expiredStatus: 'Expired',
    noneStatus: 'Not subscribed',
    daysLeft: 'Days remaining: {count}',
    daysRemainingLabel: 'Days remaining:',
    storesLimit: 'Active stores limit: {active} of {max}',
    limitExceeded: 'Notice! Your active store count exceeds your new plan limit.',
    expiringSoon: 'Warning: your subscription expires soon. Renew it in your BizX Account.',
    suspendStore: 'Suspend',
    activateStore: 'Activate',
    needBusinessSub: 'An active business subscription is required to access the business merchant portal',
    goToPricing: 'Choose a Business Plan'
  },
  admin: {
    merchantTitle: 'BizX Merchant | Business Management',
    platformTitle: 'BizX Panel | Platform',
    storeLabel: 'Store',
    selectStore: 'Select store',
    noStores: 'No stores',
    storePanel: 'Store Panel',
    overview: 'Overview',
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    detailedAnalytics: 'Detailed Analytics',
    products: 'Products & Menu',
    orders: 'Orders',
    marketing: 'Marketing & Broadcasts',
    customers: 'Customers',
    staff: 'Team',
    roles: 'Roles & Permissions',
    rolesTitle: 'Store Roles & Permissions',
    rolesSubtitle: 'Configure role priority hierarchy and flexible employee access',
    settings: 'Store Settings',
    payouts: 'Payouts',
    payoutsTitle: 'Finance & Payouts',
    payoutsDesc: 'Automated sales payouts directly to your business bank account (IBAN)',
    tariffPlan: 'Subscription Plan',
    profileInBizx: 'BizX Profile',
    manageAccountTitle: 'Manage account in BizX Portal',
    totalRevenue: 'Total Revenue',
    successfulPayments: 'Successful payments',
    totalOrders: 'Total Orders',
    processedBySystem: 'Processed by system',
    averageOrderValue: 'Average Order Value',
    perOrder: 'Per order',
    activeProducts: 'Active Products',
    inStoreCatalog: 'In store catalog',
    activeOrders: 'Active Orders',
    totalCustomers: 'Customers',
    totalStores: 'Network Stores',
    selectStoreForAnalytics: 'Select or create a store to view analytics',
    overviewTitle: 'Sales Overview',
    overviewSubtitle: 'Summary performance for "{name}"',
    statusBreakdown: 'Orders by Status',
    noStatusData: 'No status data yet',
    salesDynamics: 'Recent Sales Dynamics',
    noPeriodData: 'No data for the selected period',
    topProductsTitle: 'Top 10 Most Popular Products by Revenue',
    noTopProducts: 'No top products yet',
    productCol: 'Product',
    soldQtyCol: 'Sold qty',
    revenueCol: 'Revenue',
    openDetailedAnalytics: 'Detailed analytics & export'
  },
  analytics: {
    title: 'Detailed Analytics & Reports',
    subtitle: 'In-depth metrics, custom filtering, interactive charts, and Excel/CSV data export',
    platformSubtitle: 'Platform-wide BizX analytics with multi-dimensional filters and report export',
    filters: 'Filters',
    period: 'Period',
    periodDay: 'Last 24 hours',
    periodWeek: 'Last 7 days',
    periodMonth: 'Last 30 days',
    periodYear: 'Last year',
    periodAll: 'All time',
    dateFrom: 'Start date',
    dateTo: 'End date',
    orderStatus: 'Order status',
    allStatuses: 'All statuses',
    storeFilter: 'Store',
    allStores: 'All stores',
    minAmount: 'Min amount (₴)',
    maxAmount: 'Max amount (₴)',
    minOrders: 'Min orders',
    minQty: 'Min quantity',
    applyFilters: 'Apply',
    resetFilters: 'Reset',
    exportCsv: 'Export CSV',
    exportExcel: 'Export Excel (.xlsx)',
    exportSuccess: 'Report exported successfully',
    revenueOverTime: 'Revenue & Orders Over Time',
    revenueOverTimeDesc: 'Line chart tracking daily revenue (₴) and order volume trends',
    monthlyComparison: 'Monthly Performance',
    monthlyComparisonDesc: 'Bar chart comparing monthly revenue and order counts',
    statusDistribution: 'Orders by Status',
    statusDistributionDesc: 'Bar chart of order volume across each lifecycle status',
    topProductsChart: 'Top Products by Revenue',
    topStoresChart: 'Top Stores by Revenue',
    scatterTitle: 'Scatter Plot: Volume vs Revenue',
    scatterProductsDesc: 'Correlation between units sold (X-axis) and product revenue (Y-axis)',
    scatterStoresDesc: 'Correlation between orders count (X-axis) and store revenue (Y-axis)',
    revenueAxis: 'Revenue (₴)',
    ordersAxis: 'Orders',
    quantityAxis: 'Quantity (pcs)',
    tableTitle: 'Filtered Data Table',
    tabDaily: 'Daily',
    tabMonthly: 'Monthly',
    tabProducts: 'Products',
    tabStores: 'Stores',
    recordsCount: 'Records: {count}',
    noChartData: 'Not enough data to render this chart for the selected filters',
    shareOfRevenue: 'Revenue share',
    avgCheck: 'Avg check',
    topLimitLabel: 'Show:',
    topAll: 'All',
    rowsPerPage: 'Rows per page:',
    showingRange: 'Showing {from}–{to} of {total}',
    pageOf: 'Page {page} of {pages}',
    prevPage: 'Prev',
    nextPage: 'Next'
  },
  products: {
    title: 'Products & Catalog',
    subtitle: 'Manage your store assortment, pricing, and inventory',
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    newProduct: 'New Product',
    searchPlaceholder: 'Search by name or SKU...',
    allCategories: 'All categories',
    empty: 'No products yet',
    emptyHint: 'Add your first product so it appears in your store catalog.',
    nameLabel: 'Product name',
    skuLabel: 'SKU code',
    priceLabel: 'Price (₴)',
    oldPriceLabel: 'Compare-at price (₴)',
    stockLabel: 'Inventory count',
    descriptionLabel: 'Product description',
    imageLabel: 'Product image',
    isActiveLabel: 'Active (visible in catalog)',
    inStock: 'In stock: {count}',
    outOfStock: 'Out of stock',
    deleteConfirm: 'Archive this product?',
    created: 'Product added successfully',
    updated: 'Product updated',
    deleted: 'Product archived'
  },
  orders: {
    title: 'Customer Orders',
    subtitle: 'Track and process incoming orders in real time',
    empty: 'No orders yet',
    orderNumber: 'Order',
    customer: 'Customer',
    items: 'Items',
    amount: 'Amount',
    payment: 'Payment',
    deliveryAddress: 'Delivery address',
    notes: 'Notes',
    changeStatus: 'Change status',
    statusUpdated: 'Order status updated'
  },
  staff: {
    title: 'Store Team',
    subtitle: 'Invite managers and staff to collaborate on your store',
    addMember: 'Add team member',
    emailPlaceholder: 'Registered user email',
    roleLabel: 'Store role',
    empty: 'No other team members yet',
    memberAdded: 'Team member added successfully',
    memberRemoved: 'Team member removed',
    roleUpdated: 'Team member role updated',
    removeConfirm: 'Remove this member from the store team?'
  },
  storeSettings: {
    title: 'Store Settings',
    subtitle: 'General details, contacts, logo, and storefront banner',
    generalInfo: 'General Information',
    mediaBranding: 'Logo & Banner',
    logo: 'Store Logo',
    banner: 'Storefront Banner',
    uploadLogo: 'Upload logo',
    uploadBanner: 'Upload banner',
    saved: 'Store settings saved'
  },
  platform: {
    consoleTitle: 'Control Console',
    quickLinks: 'Quick Links',
    tabMetrics: 'Overview & Metrics',
    tabAnalytics: 'Detailed Analytics',
    tabBusinesses: 'Businesses',
    tabBusinessesAll: 'All Businesses',
    tabBusinessesPending: 'Pending Approval',
    tabUsers: 'Users',
    tabDisputes: 'Disputes',
    tabCommunications: 'Communications',
    tabSupport: 'Support Tickets',
    tabBroadcasts: 'BizX Broadcasts',
    tabStaff: 'BizX Team',
    tabRoles: 'Roles & Permissions',
    rolesTitle: 'BizX Core Platform Roles',
    rolesSubtitle: 'Role priority hierarchy and granular permissions for BizX Platform staff',
    operatorFallback: 'Platform Operator',
    logoutTitle: 'Sign out of console',
    overviewBadge: 'BizX Platform Overview',
    realtimeBadge: 'Real-time',
    metricsTitle: 'Overview & System Metrics',
    metricsSubtitle: 'Platform-wide sales volume, connected business status, and service health',
    gmv: 'Total Volume',
    orders: 'Orders',
    processedByPlatform: 'Processed by platform',
    avgCheck: 'Avg Order Value',
    acrossAllStores: 'Across all stores',
    stores: 'Stores',
    activeCount: '{count} active',
    products: 'Products',
    inBusinessCatalogs: 'In merchant catalogs',
    users: 'Users',
    bizxIdAccounts: 'BizX ID accounts',
    topStoresTitle: 'Top Performing Stores by Revenue',
    topStoresSubtitle: 'Connected businesses with the highest sales volume on the platform',
    topCount: 'Top {count}',
    noRevenueData: 'Revenue figures are calculated from paid orders',
    storeCol: 'Store',
    ordersCol: 'Orders',
    revenueCol: 'Revenue',
    shareCol: 'Revenue share',
    infraTitle: 'Platform Service Status',
    infraSubtitle: 'Live status of core BizX services',
    allSystemsOperational: 'All systems operational',
    storeStatusDist: 'Stores by Status',
    storeStatusSubtitle: 'Current lifecycle distribution of connected stores',
    activeStores: 'Active stores',
    pendingStores: 'Pending review',
    suspendedStores: 'Suspended',
    archivedStores: 'Archived',
    moderationPolicy: 'Moderation Policy',
    moderationPolicyDesc:
      'BizX staff can update store activation statuses and suspend suspicious accounts, but cannot edit merchant products or prices.',
    businessesTitle: 'Store Management',
    businessesSubtitle: 'Review applications, manage statuses, and inspect store details',
    usersTitle: 'BizX ID Users Registry',
    usersSubtitle: 'Inspect accounts, contact details, subscriptions, and manage access',
    staffTitle: 'BizX Platform Team',
    staffSubtitle: 'System administrators with access to the control console'
  },
  mobile: {
    tabStores: 'Stores',
    tabCart: 'Cart',
    tabOrders: 'Orders',
    tabProfile: 'Profile',
    emptyCart: 'Your cart is empty',
    emptyCartHint: 'Browse stores and add items to place an order',
    checkout: 'Checkout',
    orderPlaced: 'Order placed!',
    systemLanguage: 'System Device Language (Auto)',
    customLanguage: 'Selected App Language',
    languagePreference: 'App Language',
    searchStores: 'Search stores...',
    noStoresFound: 'No stores found',
    noOrdersYet: 'You have no orders yet',
    addToCart: 'Add to cart',
    addedToCart: 'Added to cart',
    deliveryAddress: 'Delivery address',
    contactName: 'Contact name',
    contactPhone: 'Contact phone',
    orderNotes: 'Order notes',
    totalToPay: 'Total to pay',
    phoneSaved: 'Phone number saved'
  },
  permissions: {
    products: {
      read: 'View products & categories',
      write: 'Create new products & categories',
      edit: 'Edit product details, prices & photos',
      status: 'Toggle product status (Active / Draft)',
      archive: 'Archive (remove) products & categories'
    },
    orders: {
      read: 'View customer orders',
      edit: 'Update order statuses & chat with customers',
      refund: 'Offer instant refunds to customers'
    },
    analytics: {
      read: 'View dashboard & sales analytics',
      export: 'Export analytics to Excel / CSV'
    },
    store: {
      admin: 'Administrator (full access except owner-only rights)',
      read: 'View store settings & details',
      edit: 'Edit store info, logo & banner',
      status: {
        manage: 'Manage store status (pause / submit review)'
      }
    },
    staff: {
      read: 'View store team members',
      write: 'Add new team members',
      edit: 'Edit member roles & permissions',
      archive: 'Archive (remove) team members'
    },
    roles: {
      read: 'View roles & permissions',
      write: 'Create new roles',
      edit: 'Edit roles & change priority order',
      archive: 'Archive (remove) roles'
    },
    marketing: {
      broadcasts: {
        read: 'View store subscribers, daily quotas & campaign history',
        send: 'Send promotional broadcasts & manage auto-discount alerts'
      }
    },
    platform: {
      admin: 'Platform Administrator (full console access respecting hierarchy)',
      stores: {
        read: 'View all platform stores',
        moderate: 'Moderate & suspend stores',
        approve: 'Approve & reject new business applications',
        unblock: 'Unblock suspended stores early',
        archive: 'Archive (remove) platform stores'
      },
      categories: {
        manage: 'Manage store categories'
      },
      users: {
        read: 'View BizX ID users registry',
        edit: 'Suspend user accounts',
        unblock: 'Unblock suspended user accounts early',
        subscriptions: 'View & manage user subscriptions',
        archive: 'Archive user accounts'
      },
      analytics: {
        read: 'View platform metrics & analytics',
        export: 'Export platform reports to Excel / CSV'
      },
      staff: {
        read: 'View BizX platform team',
        write: 'Add BizX platform staff',
        edit: 'Edit BizX staff roles',
        archive: 'Archive (remove) BizX staff'
      },
      roles: {
        read: 'View platform roles',
        write: 'Create platform roles',
        edit: 'Edit & reorder platform roles',
        archive: 'Archive (remove) platform roles'
      },
      disputes: {
        read: 'View escalated disputes & order chats',
        resolve: 'Resolve disputes, issue refunds & store strikes'
      },
      strikes: {
        issue: 'Issue manual strikes to stores',
        revoke: 'Revoke store strikes & lift suspension early'
      },
      broadcasts: {
        read: 'View official & technical BizX broadcast logs',
        send: 'Send official & technical broadcasts to BizX users'
      },
      support: {
        read: 'View incoming BizX support tickets',
        reply: 'Reply to users in BizX support tickets'
      }
    }
  },
  permissionCategories: {
    admin: 'Administration',
    products: 'Products & Catalog',
    orders: 'Orders',
    analytics: 'Analytics & Reports',
    store: 'Store Settings',
    staff: 'Team & Staff',
    roles: 'Roles & Hierarchy',
    marketing: 'Marketing & Broadcasts',
    platform_admin: 'Platform Administration',
    platform_stores: 'Platform Stores',
    platform_users: 'BizX ID Users',
    platform_analytics: 'Platform Analytics',
    platform_staff: 'BizX Staff',
    platform_roles: 'Platform Roles',
    platform_disputes: 'Disputes & Strikes',
    platform_communications: 'Communications, Broadcasts & Support'
  },
  disputes: {
    categories: {
      not_received: 'Order not received',
      damaged: 'Damaged or defective item',
      wrong_item: 'Wrong item delivered',
      missing_items: 'Missing items',
      poor_quality: 'Poor quality',
      other: 'Other (specify below)'
    },
    statuses: {
      open_store: 'Dispute open',
      escalated_platform: 'Escalated to BizX',
      withdrawn: 'Withdrawn by customer',
      resolved_refund: 'Refund accepted',
      resolved_business: 'Resolved for business',
      resolved_customer: 'Resolved for customer'
    }
  },
  permissionActions: {
    read: 'Read',
    write: 'Create',
    edit: 'Edit',
    manage: 'Manage',
    export: 'Export',
    archive: 'Archive'
  }
};

export class I18n {
  private currentLocale: SupportedLocale;
  private fallbackLocale: SupportedLocale;
  private translations: Record<SupportedLocale, TranslationDictionary>;
  private listeners: Set<(locale: SupportedLocale) => void> = new Set();

  constructor(config?: I18nConfig) {
    this.currentLocale = config?.defaultLocale ?? 'uk';
    this.fallbackLocale = config?.fallbackLocale ?? 'uk';
    this.translations = config?.translations ?? {
      uk: { ...uk },
      en: { ...en }
    };
  }

  getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  setLocale(locale: SupportedLocale): void {
    if (this.currentLocale !== locale) {
      this.currentLocale = locale;
      this.notify();
    }
  }

  subscribe(listener: (locale: SupportedLocale) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentLocale);
      } catch (err) {
        console.error('[I18n] Error in listener', err);
      }
    });
  }

  loadTranslations(locale: SupportedLocale, dict: TranslationDictionary): void {
    this.translations[locale] = {
      ...(this.translations[locale] || {}),
      ...dict
    };
    this.notify();
  }

  hasKey(key: string, locale?: SupportedLocale): boolean {
    const loc = locale ?? this.currentLocale;
    return this.resolveKey(this.translations[loc], key) !== undefined;
  }

  t(key: string, params?: InterpolationParams): string {
    return this.translate(key, params);
  }

  translate(key: string, params?: InterpolationParams): string {
    let text = this.resolveKey(this.translations[this.currentLocale], key);

    if (text === undefined && this.currentLocale !== this.fallbackLocale) {
      text = this.resolveKey(this.translations[this.fallbackLocale], key);
    }

    if (text === undefined) {
      return key;
    }

    if (params && typeof text === 'string') {
      return Object.entries(params).reduce((acc, [paramKey, val]) => {
        return acc.replaceAll(`{${paramKey}}`, () => String(val));
      }, text);
    }

    return String(text);
  }

  private resolveKey(dict: TranslationDictionary | undefined, key: string): unknown {
    if (!dict) return undefined;
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];

    const parts = key.split('.');
    let current: unknown = dict;
    for (const part of parts) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== 'object' ||
        !Object.prototype.hasOwnProperty.call(current, part)
      ) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  static detectLocale(
    storageValue?: string | null,
    navigatorLang?: string | null,
    defaultLocale: SupportedLocale = 'uk'
  ): SupportedLocale {
    if (storageValue) {
      const clean = storageValue.toLowerCase().trim();
      if (clean === 'en' || clean.startsWith('en-')) return 'en';
      if (clean === 'uk' || clean === 'ua' || clean.startsWith('uk-')) return 'uk';
    }

    if (navigatorLang) {
      const clean = navigatorLang.toLowerCase().trim();
      if (clean === 'en' || clean.startsWith('en-')) return 'en';
      if (clean === 'uk' || clean === 'ua' || clean.startsWith('uk-')) return 'uk';
    }

    return defaultLocale;
  }
}

export const i18n = new I18n({
  defaultLocale: 'uk',
  fallbackLocale: 'uk',
  translations: {
    uk,
    en
  }
});

/**
 * Translates common backend/API error strings into the active UI locale.
 */
export function translateApiError(rawMessage?: string | null, fallbackKey = 'common.unknownError'): string {
  if (!rawMessage) return i18n.t(fallbackKey);
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('номером телефона уже') ||
    lower.includes('номером телефону вже') ||
    lower.includes('phone already')
  ) {
    return i18n.t('errors.phoneExists');
  }
  if (
    lower.includes('email уже') ||
    lower.includes('email вже') ||
    lower.includes('email already')
  ) {
    return i18n.t('errors.emailExists');
  }
  if (
    lower.includes('неверный email') ||
    lower.includes('неверный логин') ||
    lower.includes('неверный номер телефона') ||
    lower.includes('невірний email') ||
    lower.includes('невірний логін') ||
    lower.includes('невірний номер телефону') ||
    lower.includes('invalid credentials')
  ) {
    return i18n.t('errors.invalidCredentials');
  }
  if (
    lower.includes('некорректный номер') ||
    lower.includes('некоректний номер') ||
    lower.includes('invalid phone')
  ) {
    return i18n.t('errors.invalidPhone');
  }
  if (
    lower.includes('некорректный email') ||
    lower.includes('некоректний email') ||
    lower.includes('invalid email')
  ) {
    return i18n.t('errors.invalidEmail');
  }
  if (
    lower.includes('пользователь не найден') ||
    lower.includes('користувача не знайдено') ||
    lower.includes('користувач не знайдений') ||
    lower.includes('user not found')
  ) {
    return i18n.t('errors.userNotFound');
  }
  if (lower.includes('unauthorized') || lower.includes('токен')) {
    return i18n.t('errors.unauthorized');
  }
  if (lower.includes('forbidden') || lower.includes('доступ')) {
    return i18n.t('errors.forbidden');
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return i18n.t('errors.networkError');
  }

  // Prevent raw HTML/proxy dumps or overly long internal errors from reaching UI banners
  if (rawMessage.length > 240 || /<[a-z!/]/i.test(rawMessage)) {
    return i18n.t(fallbackKey);
  }

  return rawMessage;
}

export const translationStore = {
  subscribe: (callback: () => void) => i18n.subscribe(() => callback()),
  getSnapshot: () => i18n.getLocale(),
  getServerSnapshot: () => 'uk' as const
};

/**
 * ============================================================================
 * Shared Formatting & Phone Country Helpers (Single Source of Truth)
 * ============================================================================
 */

export function formatMoney(
  kopecks: number,
  locale: SupportedLocale = 'uk',
  options?: { withDecimals?: boolean; currencySymbol?: string }
): string {
  const withDecimals = options?.withDecimals ?? true;
  const formatted = ((kopecks || 0) / 100).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0
  });
  return options?.currencySymbol ? `${formatted} ${options.currencySymbol}` : formatted;
}

export function getInitials(value?: string | null, fallback = 'U'): string {
  if (!value || !value.trim()) return fallback;
  const parts = value.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return value.trim().slice(0, 2).toUpperCase();
}

export function formatShortDate(
  date: string | Date | null | undefined,
  locale: SupportedLocale = 'uk'
): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'uk-UA');
}

export function formatDateTime(
  date: string | Date | null | undefined,
  locale: SupportedLocale = 'uk'
): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA');
}

export interface SharedPhoneCountry {
  iso: string;
  name: string;
  nameUk: string;
  dialCode: string;
  flag: string;
  placeholder: string;
  maxDigits: number;
  groups: number[];
}

export const SHARED_PHONE_COUNTRIES: SharedPhoneCountry[] = [
  { iso: 'UA', name: 'Ukraine', nameUk: 'Україна', dialCode: '380', flag: '🇺🇦', placeholder: '(67) 123-45-67', maxDigits: 9, groups: [2, 3, 2, 2] },
  { iso: 'PL', name: 'Poland', nameUk: 'Польща', dialCode: '48', flag: '🇵🇱', placeholder: '512 345 678', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'DE', name: 'Germany', nameUk: 'Німеччина', dialCode: '49', flag: '🇩🇪', placeholder: '151 2345 6789', maxDigits: 11, groups: [3, 4, 4] },
  { iso: 'GB', name: 'United Kingdom', nameUk: 'Велика Британія', dialCode: '44', flag: '🇬🇧', placeholder: '7700 900123', maxDigits: 10, groups: [4, 6] },
  { iso: 'US', name: 'United States', nameUk: 'США', dialCode: '1', flag: '🇺🇸', placeholder: '(555) 123-4567', maxDigits: 10, groups: [3, 3, 4] },
  { iso: 'CA', name: 'Canada', nameUk: 'Канада', dialCode: '1', flag: '🇨🇦', placeholder: '(416) 555-0123', maxDigits: 10, groups: [3, 3, 4] },
  { iso: 'CZ', name: 'Czechia', nameUk: 'Чехія', dialCode: '420', flag: '🇨🇿', placeholder: '601 123 456', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'FR', name: 'France', nameUk: 'Франція', dialCode: '33', flag: '🇫🇷', placeholder: '6 12 34 56 78', maxDigits: 9, groups: [1, 2, 2, 2, 2] },
  { iso: 'IT', name: 'Italy', nameUk: 'Італія', dialCode: '39', flag: '🇮🇹', placeholder: '312 345 6789', maxDigits: 10, groups: [3, 3, 4] },
  { iso: 'ES', name: 'Spain', nameUk: 'Іспанія', dialCode: '34', flag: '🇪🇸', placeholder: '612 345 678', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'MD', name: 'Moldova', nameUk: 'Молдова', dialCode: '373', flag: '🇲🇩', placeholder: '68 123 456', maxDigits: 8, groups: [2, 3, 3] },
  { iso: 'RO', name: 'Romania', nameUk: 'Румунія', dialCode: '40', flag: '🇷🇴', placeholder: '712 345 678', maxDigits: 9, groups: [3, 3, 3] },
  { iso: 'LT', name: 'Lithuania', nameUk: 'Литва', dialCode: '370', flag: '🇱🇹', placeholder: '612 34567', maxDigits: 8, groups: [3, 5] },
  { iso: 'GE', name: 'Georgia', nameUk: 'Грузія', dialCode: '995', flag: '🇬🇪', placeholder: '555 12 34 56', maxDigits: 9, groups: [3, 2, 2, 2] },
  { iso: 'TR', name: 'Turkey', nameUk: 'Туреччина', dialCode: '90', flag: '🇹🇷', placeholder: '532 123 45 67', maxDigits: 10, groups: [3, 3, 2, 2] }
];

export function parseSharedPhoneNumber(
  rawValue?: string | null,
  defaultIso = 'UA'
): { country: SharedPhoneCountry; nationalDigits: string } {
  const fallback =
    SHARED_PHONE_COUNTRIES.find((c) => c.iso === defaultIso) || SHARED_PHONE_COUNTRIES[0];
  if (!rawValue) return { country: fallback, nationalDigits: '' };
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return { country: fallback, nationalDigits: '' };

  const sorted = [...SHARED_PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (digits.startsWith(c.dialCode)) {
      return {
        country: c,
        nationalDigits: digits.slice(c.dialCode.length, c.dialCode.length + c.maxDigits)
      };
    }
  }
  return { country: fallback, nationalDigits: digits.slice(0, fallback.maxDigits) };
}

export function formatNationalPhoneNumber(digits: string, country: SharedPhoneCountry): string {
  const clean = digits.replace(/\D/g, '').slice(0, country.maxDigits);
  if (!clean) return '';

  if (country.iso === 'UA' || country.iso === 'US' || country.iso === 'CA') {
    const g0 = country.groups[0];
    const g1 = country.groups[1];
    const g2 = country.groups[2];
    const g3 = country.groups[3];
    const p0 = clean.slice(0, g0);
    const p1 = clean.slice(g0, g0 + g1);
    const p2 = clean.slice(g0 + g1, g0 + g1 + g2);
    const p3 = g3 ? clean.slice(g0 + g1 + g2, g0 + g1 + g2 + g3) : '';

    let out = `(${p0}`;
    if (clean.length > g0) out += `) ${p1}`;
    if (p2) out += `-${p2}`;
    if (p3) out += `-${p3}`;
    return out;
  }

  const parts: string[] = [];
  let cursor = 0;
  for (const len of country.groups) {
    if (cursor >= clean.length) break;
    parts.push(clean.slice(cursor, cursor + len));
    cursor += len;
  }
  if (cursor < clean.length) {
    parts.push(clean.slice(cursor));
  }
  return parts.join(' ');
}

/**
 * ============================================================================
 * BizX Shared Zero-Dependency Security Utilities
 * ============================================================================
 * Reusable defenses for URL sanitization, path encoding, CSV/Excel formula
 * neutralization (CWE-1236), upload validation, hostname/slug allowlists,
 * and PostgreSQL ILIKE wildcard escaping.
 */

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HOSTNAME_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const RESERVED_INTERNAL_TLDS = new Set([
  'local',
  'localhost',
  'internal',
  'arpa',
  'lan',
  'home',
  'corp',
  'localdomain',
  'invalid',
  'test',
  'example'
]);
const FORMULA_TRIGGER_RE = /^[\s\u0000-\u001F]*[=+\-@\t\r]/;
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;

export function isValidSlug(value: string | null | undefined): value is string {
  return typeof value === 'string' && SLUG_RE.test(value);
}

export function isValidCustomHostname(host: string | null | undefined): host is string {
  if (typeof host !== 'string') return false;
  const clean = host.trim().toLowerCase();
  if (!clean || clean === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(clean)) return false;
  if (!HOSTNAME_RE.test(clean)) return false;
  if (clean === 'bizx.ua' || clean.endsWith('.bizx.ua')) return false;
  const tld = clean.slice(clean.lastIndexOf('.') + 1);
  if (RESERVED_INTERNAL_TLDS.has(tld)) return false;
  return true;
}

export function encodePathSegment(segment: string): string {
  const trimmed = String(segment ?? '').trim();
  if (!trimmed || trimmed === '.' || trimmed === '..' || /[\\/\r\n\0]/.test(trimmed)) {
    throw new Error('Invalid API path segment');
  }
  return encodeURIComponent(trimmed);
}

export function escapeIlikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, '\\$&');
}

export interface SafeUrlOptions {
  allowHttp?: boolean;
  allowedOrigins?: readonly string[];
  allowRelative?: boolean;
}

/**
 * Validates URLs for <a href>, window.open(), and React Native Linking.openURL().
 * Strictly blocks javascript:, data:, vbscript:, file:, blob:, etc.
 */
export function sanitizeNavigationUrl(
  raw: string | null | undefined,
  options: SafeUrlOptions = {}
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return null;

  if (options.allowRelative && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const allowedProtocols = options.allowHttp ? ['https:', 'http:'] : ['https:'];
    if (!allowedProtocols.includes(parsed.protocol)) return null;

    if (options.allowedOrigins && options.allowedOrigins.length > 0) {
      const originAllowed = options.allowedOrigins.some(
        (origin) => origin.toLowerCase() === parsed.origin.toLowerCase()
      );
      if (!originAllowed) return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Resolves and validates media/attachment URLs against trusted API/CDN origins.
 * Strictly blocks data:, javascript:, vbscript:, and untrusted external origins.
 */
export function sanitizeMediaUrl(
  urlOrPath: string | null | undefined,
  apiBaseUrl: string,
  trustedMediaOrigins: readonly string[] = [],
  options: { allowLocalBlobPreview?: boolean; allowHttp?: boolean; blockSvg?: boolean } = {}
): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return null;

  if (options.allowLocalBlobPreview && trimmed.startsWith('blob:')) {
    return trimmed;
  }

  let baseOrigin: string;
  try {
    baseOrigin = new URL(apiBaseUrl).origin;
  } catch {
    return null;
  }

  const allowHttp = options.allowHttp ?? baseOrigin.startsWith('http://');
  const origins = [baseOrigin, ...trustedMediaOrigins];

  let resolvedStr: string | null = null;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    try {
      const resolved = new URL(trimmed, baseOrigin);
      if (resolved.origin !== baseOrigin) return null;
      resolvedStr = resolved.toString();
    } catch {
      return null;
    }
  } else {
    resolvedStr = sanitizeNavigationUrl(trimmed, {
      allowHttp,
      allowedOrigins: trustedMediaOrigins.length > 0 ? origins : undefined
    });
  }

  if (!resolvedStr) return null;

  if (options.blockSvg) {
    try {
      const pathLower = new URL(resolvedStr).pathname.toLowerCase();
      if (pathLower.endsWith('.svg')) return null;
    } catch {
      return null;
    }
  }

  return resolvedStr;
}

/**
 * Neutralizes CSV / Excel Spreadsheet Formula Injection (CWE-1236).
 */
export function sanitizeSpreadsheetCell(value: unknown): string | number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return '';
  const str = String(value);
  return FORMULA_TRIGGER_RE.test(str) ? `'${str}` : str;
}

export function sanitizeSpreadsheetRows<T extends Record<string, unknown>>(
  rows: ReadonlyArray<T>
): Record<string, string | number>[] {
  return rows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const [key, val] of Object.entries(row)) {
      out[key] = sanitizeSpreadsheetCell(val);
    }
    return out;
  });
}

export type SafeExcelCell =
  | { type: typeof String; value: string; fontWeight?: 'bold' }
  | { type: typeof Number; value: number; fontWeight?: 'bold' };

/**
 * Builds formula-safe typed 2D sheet data compatible with `write-excel-file`.
 * Automatically applies CWE-1236 neutralization to all headers and cells.
 */
export function buildSafeExcelSheetData(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<unknown>>
): SafeExcelCell[][] {
  const headerRow: SafeExcelCell[] = headers.map((h) => ({
    type: String,
    value: String(sanitizeSpreadsheetCell(h)),
    fontWeight: 'bold'
  }));
  const dataRows: SafeExcelCell[][] = rows.map((row) =>
    row.map((val) => {
      const safe = sanitizeSpreadsheetCell(val);
      return typeof safe === 'number'
        ? { type: Number, value: safe }
        : { type: String, value: safe };
    })
  );
  return [headerRow, ...dataRows];
}

/**
 * Zero-dependency RFC-4180 CSV serializer with automatic CWE-1236 formula neutralization.
 */
export function serializeSafeCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escapeCsvField = (raw: unknown): string => {
    const safe = String(sanitizeSpreadsheetCell(raw));
    return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
  };
  const lines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvField(row[h])).join(','))
  ];
  return '\uFEFF' + lines.join('\r\n');
}

export function sanitizeFilenameSegment(raw: string | null | undefined, fallback = 'export'): string {
  if (!raw) return fallback;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned || fallback;
}

export interface UploadPolicy {
  allowedMimeTypes: readonly string[];
  allowedExtensions: readonly string[];
  maxBytes: number;
}

export const UPLOAD_POLICIES = {
  rasterImage: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    maxBytes: 10 * 1024 * 1024
  },
  chatAttachment: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
    maxBytes: 10 * 1024 * 1024
  }
} as const satisfies Record<string, UploadPolicy>;

export function validateUploadFile(
  file: { name?: string | null; type?: string | null; size?: number | null },
  policy: UploadPolicy
): { ok: true } | { ok: false; code: 'INVALID_TYPE' | 'TOO_LARGE' | 'EMPTY' } {
  if (typeof file.size === 'number' && file.size <= 0) return { ok: false, code: 'EMPTY' };
  if (typeof file.size === 'number' && file.size > policy.maxBytes) {
    return { ok: false, code: 'TOO_LARGE' };
  }

  const mime = (file.type || '').toLowerCase().trim();
  const name = (file.name || '').toLowerCase().trim();

  if (mime.includes('svg') || name.endsWith('.svg') || mime.includes('html')) {
    return { ok: false, code: 'INVALID_TYPE' };
  }

  const hasAllowedMime = Boolean(mime && policy.allowedMimeTypes.includes(mime));
  const hasAllowedExt = !name || policy.allowedExtensions.some((ext) => name.endsWith(ext));

  if (!hasAllowedMime || !hasAllowedExt) {
    return { ok: false, code: 'INVALID_TYPE' };
  }
  return { ok: true };
}
