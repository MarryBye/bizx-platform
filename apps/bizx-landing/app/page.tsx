import React from 'react';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import CloudQueueOutlinedIcon from '@mui/icons-material/CloudQueueOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';

export default function HomePage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Top Metro Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 text-white rounded-md flex items-center justify-center font-bold text-sm tracking-wider">
              B
            </div>
            <div className="leading-none">
              <span className="font-extrabold text-base tracking-tight text-slate-900">BizX</span>
              <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider mt-0.5">
                Commerce Platform
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Можливості
            </a>
            <a href="#ecosystem" className="hover:text-slate-900 transition-colors">
              Екосистема
            </a>
            <a href="#architecture" className="hover:text-slate-900 transition-colors">
              Архітектура
            </a>
            <a
              href="http://localhost:3101"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              REST API
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3102"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 hover:border-slate-900 text-slate-800 transition-colors"
            >
              Вхід у кабінет
            </a>
            <a
              href="http://localhost:3102"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <span>Почати роботу</span>
              <ArrowForwardOutlinedIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-14 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 tracking-wide uppercase mb-6">
              <BoltOutlinedIcon className="w-3.5 h-3.5 text-slate-800" />
              Мінімалістична комерційна платформа нового покоління
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 leading-[1.12]">
              Операційна система для вашого ритейлу, складів та доставки
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              BizX об&apos;єднує торговельні точки, контроль товарних залишків, обробку замовлень покупців
              та мобільний застосунок у єдиній відмовостійкій системі без зайвого візуального шуму.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="http://localhost:3102"
                className="px-5 py-2.5 rounded-md bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <span>Бізнес-портал (Web Admin)</span>
                <ArrowForwardOutlinedIcon className="w-4 h-4" />
              </a>
              <a
                href="#ecosystem"
                className="px-5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Огляд архітектури
              </a>
            </div>
          </div>

          {/* Quick Metrics Metro Grid */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-2xl font-black text-slate-900 tracking-tight">3101</div>
              <div className="text-xs font-bold text-slate-700 mt-1">Core NestJS API</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Швидкісний REST бекенд</div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-2xl font-black text-slate-900 tracking-tight">3102</div>
              <div className="text-xs font-bold text-slate-700 mt-1">Merchant Portal</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Vite React + Metro UI</div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-2xl font-black text-slate-900 tracking-tight">8081</div>
              <div className="text-xs font-bold text-slate-700 mt-1">Shopper App</div>
              <div className="text-[11px] text-slate-500 mt-0.5">React Native / Expo 52</div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-2xl font-black text-slate-900 tracking-tight">R2</div>
              <div className="text-xs font-bold text-slate-700 mt-1">Cloudflare Storage</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Zero-egress медіафайли</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Metro Tiles */}
      <section id="features" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Функціональні модулі
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
              Все необхідне для торгівлі в одному монорепозиторії
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-md">
            Кожен сервіс спроєктований за принципами незалежності, строгої типізації контрактів та високої продуктивності.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <DashboardOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Адміністративний портал</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Повний контроль над каталогом товарів, зміною статусів замовлень, оновленням логотипів та аналітикою продажів.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>apps/bizx-admin</span>
              <span className="text-slate-900 font-bold">Vite 6</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <PhoneIphoneOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Мобільний застосунок клієнта</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Швидкий каталог магазинів та товарів, зручний кошик з розрахунком доставки та історія замовлень на React Native.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>apps/bizx-mobile</span>
              <span className="text-slate-900 font-bold">Expo 52</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <BoltOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">NestJS Core API Engine</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Модульний бэкенд на NestJS: JWT аутентифікація, Drizzle ORM, Zod валідація запитів та захист ендпоінтів.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>apps/api</span>
              <span className="text-slate-900 font-bold">NestJS 11</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <CloudQueueOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Cloudflare R2 сховище</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Пряме та проксоване завантаження логотипів, банерів і фотографій товарів. Жодної плати за вихідний трафік.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>S3 Compatible</span>
              <span className="text-slate-900 font-bold">R2 Bucket</span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <StorageOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Drizzle ORM & Postgres</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                100% типізована схема бази даних, швидкі міграції, підтримка транзакцій для списання залишків товарів.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>packages/database</span>
              <span className="text-slate-900 font-bold">PostgreSQL 16</span>
            </div>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <SecurityOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Рольова безпека (RBAC)</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Чітке розмежування ролей покупця (CLIENT), власника магазину (OWNER), співробітника та системного адміністратора.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>packages/common-types</span>
              <span className="text-slate-900 font-bold">RBAC Guards</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem & Architecture Breakdown */}
      <section id="ecosystem" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Послідовний робочий процес
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
              Як працює BizX в реальній комерції
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs font-black text-slate-400">01</span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Реєстрація магазину</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Створення профілю партнера, налаштування адрес, контактів, завантаження логотипу та банера точки.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs font-black text-slate-400">02</span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Формування каталогу</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Категоризація продукції, встановлення цін, складських залишків та прев&apos;ю товарів.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs font-black text-slate-400">03</span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Замовлення покупця</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Клієнт у мобільному додатку формує кошик, обирає адресу або самовивіз та підтверджує покупку.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs font-black text-slate-400">04</span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Обробка та доставка</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Магазин оновлює статус замовлення, клієнт бачить прогрес, а система автоматично коригує залишки.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Local Development Quick Links */}
      <section id="architecture" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="p-8 rounded-xl border border-slate-200 bg-slate-900 text-white">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
              Локальне оточення розробника
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-1">
              Швидкий доступ до сервісів платформи
            </h2>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Всі додатки запускаються спільною командою Turborepo та ізольовані за стандартними портами.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="http://localhost:3102"
              className="p-4 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-500 transition-colors block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Admin Dashboard</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                  :3102
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Кабінет партнера для керування магазином та замовленнями
              </p>
            </a>

            <a
              href="http://localhost:3101"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-500 transition-colors block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">NestJS API</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                  :3101
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Ендпоінти аутентифікації, магазинів, замовлень та R2 сховища
              </p>
            </a>

            <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700 block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Mobile Expo Metro</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                  :8081
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Запустіть <code className="text-slate-200">pnpm dev:mobile</code> для тестування в Expo Go
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-[10px]">
              B
            </div>
            <span className="font-semibold text-slate-700">BizX Platform</span>
            <span>—</span>
            <span>B2B & D2C Commerce Infrastructure</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="http://localhost:3102" className="hover:text-slate-900 transition-colors">
              Бізнес-кабінет
            </a>
            <a
              href="http://localhost:3101"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              API ендпоінти
            </a>
            <a
              href="https://github.com/MarryBye/bizx-platform"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
