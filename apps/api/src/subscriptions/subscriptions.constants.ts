import type { SubscriptionPlan } from '@bizx/common-types';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Базовий клієнт',
    target: 'client',
    priceUah: 0,
    period: 'Безстроково',
    maxStores: 0,
    features: [
      'Покупки у всіх відкритих закладах BizX',
      'Особистий кабінет покупця',
      'Історія замовлень та статус доставки',
      'Стандартна лінія консультацій'
    ]
  },
  {
    id: 'client_premium',
    name: 'BizX Premium',
    target: 'client',
    priceUah: 149,
    period: 'на місяць',
    maxStores: 0,
    badge: 'Для покупців',
    popular: true,
    features: [
      'Безкоштовна доставка у закладах-партнерах мережі',
      'Кешбек 5% бонусами на наступні покупки',
      'Пріоритетна черга приготування та видачі замовлень',
      'Ексклюзивний ранній доступ до спецпропозицій',
      'Підтримка 24/7 у виділеному чаті'
    ]
  },
  {
    id: 'business_starter',
    name: 'Бізнес Starter',
    target: 'business',
    priceUah: 799,
    period: 'на місяць',
    maxStores: 1,
    badge: 'Для старту',
    features: [
      'Доступ до панелі керування бізнесом (BizX Merchant)',
      '1 активна торгова точка (магазин / кафе)',
      'До 50 активних товарів та категорій',
      'Прийом та обробка замовлень у реальному часі',
      'Базова аналітика виторгу та чеків',
      'Стандартна лінія бізнес-підтримки'
    ]
  },
  {
    id: 'business_pro',
    name: 'Бізнес Pro',
    target: 'business',
    priceUah: 1899,
    period: 'на місяць',
    maxStores: 3,
    badge: 'Хіт для мереж',
    popular: true,
    features: [
      'Повний доступ до панелі керування бізнесом',
      'До 3 торгових точок (закладів або філій)',
      'Необмежена кількість товарів та модифікаторів',
      'Розширена когортна аналітика, експорт звітів',
      'Пріоритетна черга в службі модерації та підтримки',
      'Кастомізація вітрини та акційні банери',
      'Управління ролями співробітників (менеджери, персонал)'
    ]
  },
  {
    id: 'business_enterprise',
    name: 'Бізнес Enterprise',
    target: 'business',
    priceUah: 4499,
    period: 'на місяць',
    maxStores: 10,
    badge: 'Корпоративний',
    features: [
      'До 10 торгових точок у єдиному акаунті',
      'Необмежена кількість товарів та співробітників',
      'Індивідуальна зміна дизайну та кастомні теми вітрини',
      'Виділена черга в технічній підтримці BizX 24/7',
      'Персональний менеджер платформи',
      'API та Webhook інтеграції з CRM/ERP без обмежень',
      'Індивідуальний договір та безготівковий розрахунок'
    ]
  }
];

export function isSubscriptionActive(user: {
  subscriptionTier?: string | null;
  subscriptionExpiresAt?: Date | string | null;
  subscriptionStatus?: string | null;
}): boolean {
  if (!user.subscriptionTier || user.subscriptionTier === 'free') {
    return false;
  }
  if (!user.subscriptionExpiresAt) {
    return false;
  }
  const expiresAt = new Date(user.subscriptionExpiresAt).getTime();
  return expiresAt > Date.now() && user.subscriptionStatus === 'active';
}

export function getSubscriptionDaysLeft(expiresAtDate?: Date | string | null): number {
  if (!expiresAtDate) return 0;
  const expiresAt = new Date(expiresAtDate).getTime();
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getMaxAllowedStores(tier?: string | null): number {
  switch (tier) {
    case 'business_starter':
      return 1;
    case 'business_pro':
      return 3;
    case 'business_enterprise':
      return 10;
    default:
      return 0;
  }
}

export function isBusinessSubscriptionTier(tier?: string | null): boolean {
  return tier === 'business_starter' || tier === 'business_pro' || tier === 'business_enterprise';
}
