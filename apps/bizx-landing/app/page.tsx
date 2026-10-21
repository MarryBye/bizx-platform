import React from 'react';
import Link from 'next/link';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';

export default function HomePage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Top Clean Minimalist Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Minimalist Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs tracking-wider">
              B
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">BizX</span>
          </div>

          {/* Business-oriented Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Можливості
            </a>
            <a href="#benefits" className="hover:text-slate-900 transition-colors">
              Для бізнесу
            </a>
            <a href="#process" className="hover:text-slate-900 transition-colors">
              Як це працює
            </a>
            <a href="#contacts" className="hover:text-slate-900 transition-colors">
              Контакти
            </a>
          </nav>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Обліковий запис
            </Link>
            <a
              href="http://localhost:3102"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <span>Увійти в кабінет</span>
              <ArrowForwardOutlinedIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section — Product Focus */}
      <section className="pt-16 pb-14 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 tracking-wide uppercase mb-6">
              <CheckCircleOutlineOutlinedIcon className="w-3.5 h-3.5 text-slate-800" />
              Платформа для локальної торгівлі та швидких замовлень
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 leading-[1.12]">
              Розвивайте продажі вашого закладу без посередників та зайвих комісій
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              BizX надає бізнесу все необхідне для торгівлі: власний зручний каталог товарів, контроль залишків у реальному часі, обробку замовлень та нативний мобільний додаток для ваших покупців.
            </p>

            <div className="mt-8">
              <a
                href="http://localhost:3102"
                className="px-6 py-3 rounded-md bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <span>Підключити заклад до BizX</span>
                <ArrowForwardOutlinedIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Business Value Metrics Metro Grid */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-2xl font-black text-slate-900 tracking-tight">0%</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Прихованих комісій</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Вся виручка залишається вам</div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-2xl font-black text-slate-900 tracking-tight">2 хв</div>
              <div className="text-xs font-bold text-slate-800 mt-1">На запуск точки</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Швидкий старт без програмістів</div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-2xl font-black text-slate-900 tracking-tight">100%</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Контроль складу</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Миттєве списання залишків</div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="text-2xl font-black text-slate-900 tracking-tight">24/7</div>
              <div className="text-xs font-bold text-slate-800 mt-1">Прийом замовлень</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Клієнти купують з додатку</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Features — What the Buyer & Business Get */}
      <section id="features" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            Можливості платформи
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
            Створено для зручності власника та радості покупця
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            Єдиний цифровий простір, де кожен процес працює на зростання середнього чеку та повторні покупки.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <StorefrontOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Брендований профіль магазину</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Налаштовуйте логотип, банер, контакти та години роботи. Ваш бізнес виглядає сучасно, охайно та викликає довіру.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              Повна персоналізація візуалу
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <Inventory2OutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Гнучкий каталог і склад</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Швидке додавання та редагування товарів, артикулів, категорій і цін зі знижками. Клієнти бачать лише те, що реально є в наявності.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              Зменшення помилок при формуванні
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <ShoppingBagOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Прозора обробка замовлень</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Послідовний контроль кожного замовлення від прийняття до доставки. Запобігання випадковим діям завдяки перевірці підтвердження.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              Швидке комплектування позицій
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <PhoneIphoneOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Мобільний клієнт для покупців</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Покупці знаходять ваші товари на смартфоні, додають у кошик за пару дотиків і зручно оформлюють самовивіз або доставку.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              Висока конверсія в покупки
            </div>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <QueryStatsOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Зрозуміла бізнес-аналітика</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Відстежуйте денну динаміку виручки, кількість виконаних замовлень, середній чек та розподіл статусів без складних таблиць.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              Дані для прийняття рішень
            </div>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-lg border border-slate-200 bg-white flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <SecurityOutlinedIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Захист даних та доступів</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Ізольований доступ співробітників, захищені профілі користувачів та стабільна робота системи під час пікових навантажень.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
              Безпека торгових операцій
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — Step by Step Business Flow */}
      <section id="process" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Простий запуск
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
              4 кроки до старту онлайн-продажів
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs font-black text-slate-400">01</span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Створення профілю</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Введіть назву закладу, додайте адресу та завантажте фірмовий логотип і банер.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs font-black text-slate-400">02</span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Додавання товарів</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Вкажіть назви, ціни, наявність і фотографії. Розподіліть асортимент за категоріями.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs font-black text-slate-400">03</span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Прийом замовлень</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Покупці обирають товари з каталогу і миттєво відправляють замовлення у ваш кабінет.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs font-black text-slate-400">04</span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">Видача та розвиток</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Змінюйте статус готовності в один клік, видавайте покупки та збільшуйте постійну базу.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section id="benefits" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-10 rounded-xl border border-slate-200 bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Готові розпочати онлайн-продажі вже сьогодні?
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Приєднуйтесь до платформи BizX та отримайте готове рішення для замовлень без абонплат за впровадження.
            </p>
          </div>
          <a
            href="http://localhost:3102"
            className="px-6 py-3 rounded-md bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-colors shrink-0 shadow-sm"
          >
            Відкрити кабінет партнера
          </a>
        </div>
      </section>

      {/* Structured Minimalist Corporate Footer */}
      <footer id="contacts" className="border-t border-slate-200 bg-white pt-12 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100 text-xs">
            {/* Column 1: Brand info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <span className="font-extrabold text-slate-900 text-sm">BizX</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Цифрова платформа для локальних магазинів, торгових мереж та онлайн-замовлень.
              </p>
            </div>

            {/* Column 2: Product */}
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
                Продукт
              </p>
              <ul className="space-y-2 text-slate-600">
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Можливості</a></li>
                <li><a href="#benefits" className="hover:text-slate-900 transition-colors">Для бізнесу</a></li>
                <li><a href="#process" className="hover:text-slate-900 transition-colors">Як це працює</a></li>
                <li><a href="http://localhost:3102" className="hover:text-slate-900 transition-colors">Кабінет партнера</a></li>
              </ul>
            </div>

            {/* Column 3: Company & Support */}
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
                Підтримка
              </p>
              <ul className="space-y-2 text-slate-600">
                <li><span className="text-slate-500">support@bizx.ua</span></li>
                <li><span className="text-slate-500">+380 (44) 000-00-00</span></li>
                <li><span className="text-slate-500">Пн-Пт: 09:00 — 18:00</span></li>
              </ul>
            </div>

            {/* Column 4: Legal */}
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
                Юридична інформація
              </p>
              <ul className="space-y-2 text-slate-600">
                <li><span className="text-slate-500">Умови використання</span></li>
                <li><span className="text-slate-500">Політика конфіденційності</span></li>
                <li><span className="text-slate-500">Ліцензійна угода</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} BizX Platform. Всі права захищено.</p>
            <p>Україна</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
