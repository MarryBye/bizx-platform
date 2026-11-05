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

export const uk = {
  common: {
    save: 'Зберегти',
    cancel: 'Скасувати',
    edit: 'Редагувати',
    delete: 'Видалити',
    archive: 'Архівувати',
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
    optional: 'необов’язково',
    required: 'обов’язково',
    all: 'Всі',
    confirm: 'Підтвердити',
    apply: 'Застосувати',
    days: 'днів',
    uah: 'грн'
  },
  nav: {
    home: 'Головна',
    catalog: 'Каталог закладів',
    pricing: 'Тарифи',
    account: 'Мій кабінет',
    businessAdmin: 'Панель бізнесу',
    platformAdmin: 'BizX Panel',
    orders: 'Замовлення',
    cart: 'Кошик',
    profile: 'Профіль',
    settings: 'Налаштування',
    stores: 'Заклади'
  },
  auth: {
    signIn: 'Увійти до акаунту',
    signUp: 'Створити акаунт',
    signInTitle: 'Вхід у BizX ID',
    signUpTitle: 'Реєстрація у BizX',
    email: 'Електронна пошта',
    password: 'Пароль',
    confirmPassword: 'Підтвердження паролю',
    fullName: "Повне ім'я",
    phone: 'Номер телефону',
    haveAccount: 'Вже маєте обліковий запис?',
    noAccount: 'Ще не маєте облікового запису?',
    clientRole: 'Покупець',
    businessRole: 'Власник бізнесу',
    logoutConfirm: 'Ви дійсно бажаєте вийти з облікового запису?',
    invalidCredentials: 'Невірний логін або пароль [AUTH_1001]',
    accessForbidden: 'Доступ до розділу обмежено [AUTH_1002]',
    loginSuccess: 'Успішний вхід',
    registerSuccess: 'Акаунт успішно зареєстровано'
  },
  account: {
    title: 'Особистий кабінет BizX',
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
    avatarUploadSuccess: 'Аватарку успішно оновлено'
  },
  pricing: {
    title: 'Тарифи та плани BizX',
    subtitle: 'Прозорі умови для покупців та ефективні інструменти зростання для бізнесу.',
    forBusiness: 'Для бізнесу',
    forClients: 'Для покупців',
    perMonth: 'на місяць',
    popular: 'Найпопулярніший',
    currentPlan: 'Ваш поточний план',
    upgradePlan: 'Перейти на тариф',
    activate30Days: 'Підключити на 30 днів (симуляція)',
    noCardNeeded: 'Банківська картка не потрібна. Це демонстраційне підключення.',
    subscribeSuccess: 'Тариф успішно активовано на 30 днів!',
    faqTitle: 'Часті запитання про тарифи'
  },
  subscriptions: {
    currentPlan: 'Поточний тарифний план',
    status: 'Статус підписки',
    activeStatus: 'Активна',
    expiredStatus: 'Закінчилась',
    daysLeft: 'Днів залишилося: {count}',
    storesLimit: 'Ліміт активних закладів: {active} з {max}',
    limitExceeded: 'Увага! Кількість ваших активних закладів перевищує ліміт нового тарифу.',
    suspendStore: 'Призупинити',
    activateStore: 'Активувати',
    needBusinessSub: 'Для доступу до панелі управління бізнесом потрібна активна бізнес-підписка'
  },
  admin: {
    merchantTitle: 'BizX Merchant | Керування бізнесом',
    platformTitle: 'BizX Panel | Платформа',
    dashboard: 'Дашборд',
    products: 'Товари та меню',
    orders: 'Замовлення',
    staff: 'Команда',
    analytics: 'Аналітика',
    settings: 'Налаштування закладу',
    totalRevenue: 'Загальний виторг',
    activeOrders: 'Активні замовлення',
    totalCustomers: 'Клієнти',
    totalStores: 'Заклади мережі'
  },
  mobile: {
    tabStores: 'Заклади',
    tabCart: 'Кошик',
    tabOrders: 'Замовлення',
    tabProfile: 'Профіль',
    emptyCart: 'Ваш кошик порожній',
    checkout: 'Оформити замовлення',
    orderPlaced: 'Замовлення оформлено!',
    systemLanguage: 'Системна мова пристрою (Авто)',
    customLanguage: 'Обрана мова додатку',
    languagePreference: 'Мова додатку'
  }
};

export const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    archive: 'Archive',
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
    days: 'days',
    uah: 'UAH'
  },
  nav: {
    home: 'Home',
    catalog: 'Stores Catalog',
    pricing: 'Pricing',
    account: 'My Account',
    businessAdmin: 'Business Panel',
    platformAdmin: 'BizX Panel',
    orders: 'Orders',
    cart: 'Cart',
    profile: 'Profile',
    settings: 'Settings',
    stores: 'Stores'
  },
  auth: {
    signIn: 'Sign in to account',
    signUp: 'Create account',
    signInTitle: 'Sign in with BizX ID',
    signUpTitle: 'Register for BizX',
    email: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm password',
    fullName: 'Full name',
    phone: 'Phone number',
    haveAccount: 'Already have an account?',
    noAccount: "Don't have an account yet?",
    clientRole: 'Customer',
    businessRole: 'Business Owner',
    logoutConfirm: 'Are you sure you want to sign out?',
    invalidCredentials: 'Invalid login or password [AUTH_1001]',
    accessForbidden: 'Access restricted [AUTH_1002]',
    loginSuccess: 'Successfully signed in',
    registerSuccess: 'Account successfully registered'
  },
  account: {
    title: 'BizX Personal Account',
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
    ukrainian: 'Українська (Ukrainian)',
    english: 'English',
    languageUpdated: 'Interface language updated successfully',
    saveChanges: 'Save changes',
    personalInfo: 'Personal Information',
    avatar: 'Profile picture (avatar)',
    avatarUploadSuccess: 'Avatar updated successfully'
  },
  pricing: {
    title: 'BizX Pricing & Plans',
    subtitle: 'Transparent terms for shoppers and powerful growth tools for businesses.',
    forBusiness: 'For Business',
    forClients: 'For Customers',
    perMonth: 'per month',
    popular: 'Most Popular',
    currentPlan: 'Your current plan',
    upgradePlan: 'Upgrade plan',
    activate30Days: 'Activate for 30 days (simulation)',
    noCardNeeded: 'No credit card required. This is a demonstration activation.',
    subscribeSuccess: 'Plan successfully activated for 30 days!',
    faqTitle: 'Frequently Asked Questions'
  },
  subscriptions: {
    currentPlan: 'Current subscription plan',
    status: 'Subscription status',
    activeStatus: 'Active',
    expiredStatus: 'Expired',
    daysLeft: 'Days remaining: {count}',
    storesLimit: 'Active stores limit: {active} of {max}',
    limitExceeded: 'Notice! Your active store count exceeds your new plan limit.',
    suspendStore: 'Suspend',
    activateStore: 'Activate',
    needBusinessSub: 'An active business subscription is required to access the business merchant portal'
  },
  admin: {
    merchantTitle: 'BizX Merchant | Business Management',
    platformTitle: 'BizX Panel | Platform',
    dashboard: 'Dashboard',
    products: 'Products & Menu',
    orders: 'Orders',
    staff: 'Team',
    analytics: 'Analytics',
    settings: 'Store Settings',
    totalRevenue: 'Total Revenue',
    activeOrders: 'Active Orders',
    totalCustomers: 'Customers',
    totalStores: 'Network Stores'
  },
  mobile: {
    tabStores: 'Stores',
    tabCart: 'Cart',
    tabOrders: 'Orders',
    tabProfile: 'Profile',
    emptyCart: 'Your cart is empty',
    checkout: 'Checkout',
    orderPlaced: 'Order placed!',
    systemLanguage: 'System Device Language (Auto)',
    customLanguage: 'Selected App Language',
    languagePreference: 'App Language'
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
        return acc.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      }, text);
    }

    return String(text);
  }

  private resolveKey(dict: TranslationDictionary | undefined, key: string): unknown {
    if (!dict) return undefined;
    if (dict[key] !== undefined) return dict[key];

    const parts = key.split('.');
    let current: unknown = dict;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
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

export const translationStore = {
  subscribe: (callback: () => void) => i18n.subscribe(() => callback()),
  getSnapshot: () => i18n.getLocale(),
  getServerSnapshot: () => 'uk' as const
};
