'use client';

import React from 'react';
import Link from 'next/link';
import { SiteHeader } from './components/SiteHeader';
import { useTranslation } from './hooks/useTranslation';
import {
  Store,
  ShoppingBag,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Package,
  BarChart3
} from 'lucide-react';

export default function HomePage(): React.JSX.Element {
  const { t, locale } = useTranslation();

  const metrics = [
    {
      value: '0%',
      title: t('landing.statsCommission'),
      sub: locale === 'en' ? 'Keep 100% of your sales revenue' : 'Вся виручка залишається вам'
    },
    {
      value: locale === 'en' ? '2 min' : '2 хв',
      title: t('landing.statsSetup'),
      sub: locale === 'en' ? 'Fast launch without developers' : 'Швидкий старт без програмістів'
    },
    {
      value: '100%',
      title: locale === 'en' ? 'Inventory control' : 'Контроль складу',
      sub: locale === 'en' ? 'Instant stock synchronization' : 'Миттєве списання залишків'
    },
    {
      value: '24/7',
      title: locale === 'en' ? 'Order intake' : 'Прийом замовлень',
      sub: locale === 'en' ? 'Shoppers order from the mobile app' : 'Клієнти купують з додатку'
    }
  ];

  const features = [
    {
      icon: Store,
      title: t('landing.feature1Title'),
      desc: t('landing.feature1Desc'),
      footer: locale === 'en' ? 'Full visual branding' : 'Повна персоналізація візуалу'
    },
    {
      icon: Package,
      title: t('landing.feature5Title'),
      desc: t('landing.feature5Desc'),
      footer: locale === 'en' ? 'Global edge delivery' : 'Швидке завантаження медіа'
    },
    {
      icon: ShoppingBag,
      title: t('landing.feature2Title'),
      desc: t('landing.feature2Desc'),
      footer: locale === 'en' ? 'Fast order fulfillment' : 'Швидке комплектування позицій'
    },
    {
      icon: Smartphone,
      title: t('landing.feature4Title'),
      desc: t('landing.feature4Desc'),
      footer: locale === 'en' ? 'Flexible role permissions' : 'Гнучкі права доступу'
    },
    {
      icon: BarChart3,
      title: t('landing.feature3Title'),
      desc: t('landing.feature3Desc'),
      footer: locale === 'en' ? 'Actionable business insights' : 'Дані для прийняття рішень'
    },
    {
      icon: ShieldCheck,
      title: t('landing.feature6Title'),
      desc: t('landing.feature6Desc'),
      footer: locale === 'en' ? 'Email & phone sign-in' : 'Вхід за Email або телефоном'
    }
  ];

  const steps = [
    { num: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { num: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { num: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
    { num: '04', title: t('landing.step4Title'), desc: t('landing.step4Desc') }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white">
      <SiteHeader />

      {/* Hero Section */}
      <section className="pt-16 pb-14 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 tracking-wide uppercase mb-6">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-slate-800" />
              <span>{t('landing.badge')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 leading-[1.12]">
              {t('landing.heroTitle')}
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              {t('landing.heroSubtitle')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="http://localhost:3102"
                className="px-6 py-3 rounded-md bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <span>{t('landing.ctaPartner')}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </a>
              <Link
                href="/pricing"
                className="px-6 py-3 rounded-md border border-slate-300 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
              >
                <span>{t('landing.ctaPricing')}</span>
              </Link>
            </div>
          </div>

          {/* Business Value Metrics Metro Grid */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <div key={m.title} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="text-2xl font-black text-slate-900 tracking-tight">{m.value}</div>
                <div className="text-xs font-bold text-slate-800 mt-1">{m.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Features */}
      <section id="features" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            {t('landing.featuresTag')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
            {t('landing.featuresTitle')}
          </h2>
          <p className="text-xs text-slate-500 mt-2">{t('landing.featuresSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-6 rounded-lg border border-slate-200 bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                    <Icon className="w-5 h-5 shrink-0" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  {f.footer}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="process" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              {t('landing.processTag')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
              {t('landing.processTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.num} className="p-5 rounded-lg border border-slate-200 bg-slate-50/50">
                <span className="text-xs font-black text-slate-400">{s.num}</span>
                <h4 className="text-sm font-bold text-slate-900 mt-2">{s.title}</h4>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section id="benefits" className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-10 rounded-xl border border-slate-200 bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t('landing.contactsTitle')}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t('landing.contactsSubtitle')}
            </p>
          </div>
          <a
            href="http://localhost:3102"
            className="px-6 py-3 rounded-md bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-colors shrink-0 shadow-sm"
          >
            {t('landing.ctaPartner')}
          </a>
        </div>
      </section>

      {/* Structured Minimalist Corporate Footer */}
      <footer id="contacts" className="border-t border-slate-200 bg-white pt-12 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100 text-xs">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <span className="font-extrabold text-slate-900 text-sm">BizX</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                {t('landing.heroSubtitle')}
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
                {t('landing.footerProduct')}
              </p>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <a href="#features" className="hover:text-slate-900 transition-colors">
                    {t('nav.features')}
                  </a>
                </li>
                <li>
                  <a href="#benefits" className="hover:text-slate-900 transition-colors">
                    {t('nav.forBusiness')}
                  </a>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-slate-900 transition-colors">
                    {t('nav.pricing')}
                  </Link>
                </li>
                <li>
                  <a href="http://localhost:3102" className="hover:text-slate-900 transition-colors">
                    {t('nav.businessAdmin')}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
                {t('landing.footerSupport')}
              </p>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <span className="text-slate-500">support@bizx.ua</span>
                </li>
                <li>
                  <span className="text-slate-500">+380 (44) 000-00-00</span>
                </li>
                <li>
                  <span className="text-slate-500">
                    {locale === 'en' ? 'Mon-Fri: 09:00 — 18:00' : 'Пн-Пт: 09:00 — 18:00'}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3">
                {locale === 'en' ? 'Legal' : 'Юридична інформація'}
              </p>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <span className="text-slate-500">
                    {locale === 'en' ? 'Terms of Service' : 'Умови використання'}
                  </span>
                </li>
                <li>
                  <span className="text-slate-500">
                    {locale === 'en' ? 'Privacy Policy' : 'Політика конфіденційності'}
                  </span>
                </li>
                <li>
                  <span className="text-slate-500">
                    {locale === 'en' ? 'License Agreement' : 'Ліцензійна угода'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>
              © {new Date().getFullYear()} BizX Platform. {t('landing.footerRights')}
            </p>
            <p>{locale === 'en' ? 'Ukraine' : 'Україна'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
