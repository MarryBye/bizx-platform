import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../lib/api';
import type { DomainVerificationResult, StoreStrikeItem } from '@bizx/common-types';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, PhoneInput, ConfirmModal, StatusBadge } from '@bizx/ui';
import {
  Upload,
  Check,
  AlertCircle,
  Building,
  Image as ImageIcon,
  Globe,
  ExternalLink,
  Copy,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Send
} from 'lucide-react';
import { StoreMediaImage } from '../components/StoreMediaImage';

export const StoreSettingsView: React.FC<{ isReadOnly?: boolean; canEdit?: boolean }> = ({
  isReadOnly: isReadOnlyProp,
  canEdit: canEditProp
}) => {
  const { activeStore, uploadStoreMedia, updateStore, fetchStores, isLoading } = useBusinessStore();
  const { hasActiveSubscription } = useAuthStore();
  const { t, locale } = useTranslation();
  const isReadOnly = isReadOnlyProp !== undefined ? isReadOnlyProp : !hasActiveSubscription;
  const canEdit = canEditProp !== undefined ? canEditProp && !isReadOnly : !isReadOnly;

  const [name, setName] = useState(activeStore?.name || '');
  const [description, setDescription] = useState(activeStore?.description || '');
  const [address, setAddress] = useState(activeStore?.address || '');
  const [phone, setPhone] = useState(activeStore?.phone || '');
  const [email, setEmail] = useState(activeStore?.email || '');

  // Custom domain state
  const [customDomain, setCustomDomain] = useState(activeStore?.customDomain || '');
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainResult, setDomainResult] = useState<DomainVerificationResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [strikes, setStrikes] = useState<StoreStrikeItem[]>([]);
  const [isLoadingStrikes, setIsLoadingStrikes] = useState(false);
  const [confirmModerationOpen, setConfirmModerationOpen] = useState(false);
  const [isSubmittingModeration, setIsSubmittingModeration] = useState(false);

  useEffect(() => {
    let active = true;
    if (!activeStore?.id) {
      setStrikes([]);
      return;
    }
    setIsLoadingStrikes(true);
    api.orders
      .getStoreStrikes(activeStore.id)
      .then((res) => {
        if (active && res.success && res.data) setStrikes(res.data);
      })
      .catch(() => {
        if (active) setStrikes([]);
      })
      .finally(() => {
        if (active) setIsLoadingStrikes(false);
      });
    return () => {
      active = false;
    };
  }, [activeStore?.id]);

  const handleSubmitForModeration = async () => {
    if (!activeStore) return;
    setIsSubmittingModeration(true);
    setStatusMessage(null);
    try {
      const ok = await updateStore({ status: 'pending' });
      if (ok) {
        await fetchStores();
        setStatusMessage({
          text:
            locale === 'en'
              ? 'Store submitted for BizX moderation!'
              : 'Заклад успішно відправлено на перевірку модераторам BizX!'
        });
      }
      setConfirmModerationOpen(false);
    } catch (err: any) {
      setStatusMessage({
        text: err?.data?.message || err?.message || 'Не вдалося відправити на модерацію',
        isError: true
      });
      setConfirmModerationOpen(false);
    } finally {
      setIsSubmittingModeration(false);
    }
  };

  // Скидання локальних станів та прев'ю при зміні активного магазину
  useEffect(() => {
    setLogoPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setBannerPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });

    setName(activeStore?.name || '');
    setDescription(activeStore?.description || '');
    setAddress(activeStore?.address || '');
    setPhone(activeStore?.phone || '');
    setEmail(activeStore?.email || '');
    setCustomDomain(activeStore?.customDomain || '');
    setDomainResult(null);
  }, [activeStore]);

  // Очищення blob URL при розмонтуванні компонента
  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
      if (bannerPreview?.startsWith('blob:')) URL.revokeObjectURL(bannerPreview);
    };
  }, [logoPreview, bannerPreview]);

  if (!activeStore) {
    return (
      <div className="p-8 text-center text-slate-500">
        Оберіть магазин для налаштування
      </div>
    );
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    setStatusMessage(null);
    setIsUploadingLogo(true);

    try {
      const ok = await uploadStoreMedia('logo', file);
      if (ok) {
        setStatusMessage({
          text: locale === 'en' ? 'Logo updated successfully!' : 'Логотип успішно оновлено!'
        });
      } else {
        setStatusMessage({
          text: locale === 'en' ? 'Failed to upload logo' : 'Не вдалося завантажити логотип',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Помилка завантаження логотипу';
      setStatusMessage({ text: msg, isError: true });
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (bannerPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreview);
    }
    const localUrl = URL.createObjectURL(file);
    setBannerPreview(localUrl);
    setStatusMessage(null);
    setIsUploadingBanner(true);

    try {
      const ok = await uploadStoreMedia('banner', file);
      if (ok) {
        setStatusMessage({
          text: locale === 'en' ? 'Banner updated successfully!' : 'Банер успішно оновлено!'
        });
      } else {
        setStatusMessage({
          text: locale === 'en' ? 'Failed to upload banner' : 'Не вдалося завантажити банер',
          isError: true
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Помилка завантаження банера';
      setStatusMessage({ text: msg, isError: true });
    } finally {
      setIsUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const ok = await updateStore({
      name: name.trim(),
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined
    });

    if (ok) {
      setStatusMessage({ text: 'Інформацію про магазин успішно збережено!' });
    } else {
      setStatusMessage({ text: 'Помилка збереження даних магазину', isError: true });
    }
  };

  const handleOpenStorefront = async () => {
    if (!activeStore) return;
    if (activeStore.status === 'active') {
      window.open(`http://localhost:3100/store/${activeStore.slug}`, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const res = await api.stores.createPreviewToken(activeStore.id);
      if (res.success && res.data?.previewToken) {
        window.open(
          `http://localhost:3100/store/${activeStore.slug}?preview=${encodeURIComponent(res.data.previewToken)}`,
          '_blank',
          'noopener,noreferrer'
        );
        return;
      }
    } catch {
      // fallback
    }
    window.open(`http://localhost:3100/store/${activeStore.slug}`, '_blank', 'noopener,noreferrer');
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !canEdit) return;
    setIsSavingDomain(true);
    setStatusMessage(null);
    setDomainResult(null);
    try {
      const res = await api.stores.updateDomain(activeStore.id, {
        customDomain: customDomain.trim() ? customDomain.trim().toLowerCase() : null
      });
      if (res.success) {
        await fetchStores();
        setStatusMessage({
          text: customDomain.trim()
            ? locale === 'en'
              ? 'Custom domain saved. Add the DNS records below and click Verify.'
              : 'Власний домен збережено. Додайте DNS-записи нижче та натисніть «Перевірити DNS».'
            : locale === 'en'
              ? 'Custom domain removed.'
              : 'Власний домен відв’язано.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: err?.data?.message || err?.message || 'Помилка збереження домену',
        isError: true
      });
    } finally {
      setIsSavingDomain(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!activeStore || !canEdit) return;
    setIsVerifyingDomain(true);
    try {
      const res = await api.stores.verifyDomain(activeStore.id);
      if (res.success && res.data) {
        setDomainResult(res.data);
        if (res.data.verified) {
          await fetchStores();
        }
      }
    } catch (err: any) {
      setStatusMessage({
        text: err?.data?.message || err?.message || 'Не вдалося перевірити DNS',
        isError: true
      });
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const copyText = (key: string, val: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('storeSettings.title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('storeSettings.subtitle')}
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            statusMessage.isError
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <Check className="w-5 h-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Media Customization Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-slate-600" /> {t('storeSettings.mediaBranding')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Banner Upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Банер магазину (шапка)</label>
            <div className="w-full h-40 bg-slate-100 rounded-xl overflow-hidden relative border group flex items-center justify-center">
              <StoreMediaImage
                type="banner"
                src={bannerPreview || activeStore.bannerUrl}
                alt="Banner"
                className="w-full h-full object-cover"
              />

              {canEdit && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer px-4 py-2 bg-white/95 text-slate-800 rounded-xl text-xs font-semibold hover:bg-white shadow-md flex items-center gap-2 transition-transform hover:scale-105">
                    <Upload className="w-4 h-4 text-blue-600" />
                    {isUploadingBanner ? 'Завантаження...' : 'Завантажити новий банер'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingBanner || !canEdit}
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Логотип магазину</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border overflow-hidden flex items-center justify-center relative group shrink-0">
                <StoreMediaImage
                  type="logo"
                  src={logoPreview || activeStore.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>

              {canEdit && (
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                    <Upload className="w-4 h-4 text-blue-600" />
                    {isUploadingLogo ? 'Завантаження...' : 'Обрати новий логотип'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingLogo || !canEdit}
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Підтримуються формати PNG, JPEG, SVG та WebP до 10 МБ
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Info Form */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-600" /> Основні дані та реквізити
            </span>
            {!canEdit && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                {locale === 'en' ? 'View only' : 'Тільки перегляд'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Назва магазину</label>
                <Input
                  required
                  disabled={!canEdit}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Адреса (місто, вулиця)</label>
                <Input
                  disabled={!canEdit}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="м. Київ, вул. Хрещатик, 1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">{t('account.storePhoneLabel')}</label>
                <PhoneInput
                  disabled={!canEdit}
                  value={phone}
                  onChange={setPhone}
                  locale={locale}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email для сповіщень</label>
                <Input
                  type="email"
                  disabled={!canEdit}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shop@bizx.ua"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Опис магазину</label>
              <Textarea
                disabled={!canEdit}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Короткий опис діяльності для покупців..."
              />
            </div>

            {canEdit && (
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isLoading || !canEdit}>
                  {isLoading ? t('common.saving') : t('account.saveChanges')}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Storefront Web Address & Custom Domain */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-600" />
              <span>
                {locale === 'en'
                  ? 'Web Storefront & Custom Domain'
                  : 'Веб-вітрина та власний домен'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void handleOpenStorefront()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <span>
                {activeStore.status === 'active'
                  ? locale === 'en'
                    ? 'Open storefront'
                    : 'Відкрити веб-сайт закладу'
                  : locale === 'en'
                    ? 'Preview storefront'
                    : 'Попередній перегляд вітрини'}
              </span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {locale === 'en' ? 'Default BizX address' : 'Базова адреса на BizX'}
              </span>
              <span className="font-mono font-bold text-slate-900">
                https://{activeStore.slug}.bizx.ua
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-center">
              <CheckCircle2 className="w-3 h-3" />
              <span>{t('common.active')}</span>
            </span>
          </div>

          <form onSubmit={handleSaveDomain} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                {locale === 'en'
                  ? 'Custom domain (purchased at any registrar)'
                  : 'Власний домен (придбаний у будь-якого реєстратора)'}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  disabled={!canEdit}
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="shop.mycoffee.ua"
                />
                {canEdit && (
                  <Button type="submit" disabled={isSavingDomain} className="shrink-0">
                    {isSavingDomain ? t('common.saving') : t('common.save')}
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {locale === 'en'
                  ? 'Enter your domain without https:// (e.g. shop.mycoffee.ua). You will receive DNS records to connect it at your registrar.'
                  : 'Вкажіть домен без https:// (наприклад, shop.mycoffee.ua). Після збереження з’являться DNS-записи для налаштування у вашого реєстратора.'}
              </p>
            </div>
          </form>

          {activeStore.customDomain && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {activeStore.customDomain}
                  </span>
                  {activeStore.customDomainVerified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {locale === 'en' ? 'Verified' : 'Підтверджено'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {locale === 'en' ? 'Pending DNS' : 'Очікує налаштування DNS'}
                    </span>
                  )}
                </div>

                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isVerifyingDomain}
                    onClick={handleVerifyDomain}
                    className="inline-flex items-center gap-1.5 text-xs font-bold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingDomain ? 'animate-spin' : ''}`} />
                    <span>{locale === 'en' ? 'Verify DNS' : 'Перевірити DNS'}</span>
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="py-2 px-3">Тип</th>
                      <th className="py-2 px-3">Ім’я / Host</th>
                      <th className="py-2 px-3">Значення / Target</th>
                      <th className="py-2 px-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-900">CNAME</td>
                      <td className="py-2 px-3 text-slate-700">{activeStore.customDomain}</td>
                      <td className="py-2 px-3 text-slate-900">shops.bizx.ua</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => copyText('cname', 'shops.bizx.ua')}
                          className="text-slate-400 hover:text-slate-900"
                          title="Copy"
                        >
                          {copiedKey === 'cname' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {activeStore.domainVerificationToken && (
                      <tr>
                        <td className="py-2 px-3 font-bold text-slate-900">TXT</td>
                        <td className="py-2 px-3 text-slate-700">
                          _bizx-verify.{activeStore.customDomain}
                        </td>
                        <td className="py-2 px-3 text-slate-900 break-all">
                          {activeStore.domainVerificationToken}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => copyText('txt', activeStore.domainVerificationToken || '')}
                            className="text-slate-400 hover:text-slate-900"
                            title="Copy"
                          >
                            {copiedKey === 'txt' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {domainResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs border ${
                    domainResult.verified
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {domainResult.message}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {activeStore.status === 'draft' && canEdit && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-600" />
                {locale === 'en' ? 'Ready to publish your store?' : 'Готові опублікувати заклад?'}
              </div>
              <p className="text-xs text-amber-900/80">
                {locale === 'en'
                  ? 'Submit your store for BizX moderation. Once approved, it becomes live for all customers.'
                  : 'Надішліть заклад на перевірку адміністраторам BizX. Після схвалення вітрина стане доступною покупцям.'}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setConfirmModerationOpen(true)}
              className="gap-1.5 shrink-0 self-start sm:self-center"
            >
              <Send className="w-3.5 h-3.5" />
              {locale === 'en' ? 'Submit for Review' : 'Надіслати на модерацію'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            {locale === 'en' ? 'Moderation Strikes & Compliance' : 'Страйки та статус дотримання правил'}
          </CardTitle>
          {(() => {
            const activeCount = strikes.filter(
              (s) => !s.revokedAt && (!s.expiresAt || new Date(s.expiresAt) > new Date())
            ).length;
            return (
              <StatusBadge
                tone={activeCount >= 3 ? 'rose' : activeCount > 0 ? 'amber' : 'emerald'}
                size="xs"
                dot
              >
                {locale === 'en' ? `${activeCount} / 3 active` : `${activeCount} / 3 активних`}
              </StatusBadge>
            );
          })()}
        </CardHeader>
        <CardContent className="pt-4">
          {isLoadingStrikes ? (
            <div className="text-xs text-slate-400">
              {locale === 'en' ? 'Loading strike history...' : 'Завантаження історії страйків...'}
            </div>
          ) : strikes.length === 0 ? (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {locale === 'en'
                  ? 'Your store has zero moderation strikes. Keep up the great service!'
                  : 'У вашого закладу немає жодного страйку. Дякуємо за дотримання стандартів BizX!'}
              </span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {strikes.map((st) => {
                const isExpired = Boolean(st.expiresAt && new Date(st.expiresAt) <= new Date());
                const isActiveStrike = !st.revokedAt && !isExpired;
                return (
                  <div key={st.id} className="p-3.5 space-y-1 bg-white">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <StatusBadge tone={isActiveStrike ? 'rose' : 'slate'} size="xs">
                        {st.revokedAt
                          ? locale === 'en'
                            ? 'Revoked'
                            : 'Знято'
                          : isExpired
                            ? locale === 'en'
                              ? 'Expired'
                              : 'Минув'
                            : locale === 'en'
                              ? 'Active strike'
                              : 'Активний страйк'}
                      </StatusBadge>
                      <span className="text-[11px] text-slate-400">
                        {new Date(st.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'uk-UA')}
                        {st.expiresAt && isActiveStrike && (
                          <>
                            {' · '}
                            {locale === 'en' ? 'expires ' : 'діє до '}
                            {new Date(st.expiresAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'uk-UA')}
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{st.reason}</p>
                    {st.revokeReason && (
                      <p className="text-[11px] text-emerald-700">
                        {locale === 'en' ? 'Revoke note:' : 'Причина зняття:'} {st.revokeReason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={confirmModerationOpen}
        onClose={() => !isSubmittingModeration && setConfirmModerationOpen(false)}
        onConfirm={() => void handleSubmitForModeration()}
        isLoading={isSubmittingModeration}
        confirmVariant="primary"
        title={locale === 'en' ? 'Submit store for moderation?' : 'Надіслати заклад на модерацію?'}
        confirmLabel={locale === 'en' ? 'Submit' : 'Надіслати'}
        cancelLabel={locale === 'en' ? 'Cancel' : 'Скасувати'}
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          {locale === 'en'
            ? `Store «${activeStore.name}» will be reviewed by BizX moderators. Make sure logo, description, contacts, and catalog are ready.`
            : `Заклад «${activeStore.name}» буде передано на перевірку модераторам BizX. Переконайтеся, що заповнено логотип, опис, контакти та товари.`}
        </p>
      </ConfirmModal>
    </div>
  );
};
