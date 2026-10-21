import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea } from '@bizx/ui';
import { Upload, Check, AlertCircle, Building, Image as ImageIcon } from 'lucide-react';
import { StoreMediaImage } from '../components/StoreMediaImage';

export const StoreSettingsView: React.FC = () => {
  const { activeStore, uploadStoreMedia, updateStore, isLoading } = useBusinessStore();

  const [name, setName] = useState(activeStore?.name || '');
  const [description, setDescription] = useState(activeStore?.description || '');
  const [address, setAddress] = useState(activeStore?.address || '');
  const [phone, setPhone] = useState(activeStore?.phone || '');
  const [email, setEmail] = useState(activeStore?.email || '');

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

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
        setStatusMessage({ text: 'Логотип успішно оновлено в бакеті R2!' });
      } else {
        setStatusMessage({ text: 'Не вдалося завантажити логотип', isError: true });
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
        setStatusMessage({ text: 'Банер успішно оновлено в бакеті R2!' });
      } else {
        setStatusMessage({ text: 'Не вдалося завантажити банер', isError: true });
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
      name,
      description,
      address,
      phone,
      email
    });

    if (ok) {
      setStatusMessage({ text: 'Інформацію про магазин успішно збережено!' });
    } else {
      setStatusMessage({ text: 'Помилка збереження даних магазину', isError: true });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Налаштування магазину та медіа
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Керуйте візуальним оформленням, логотипом, банером та контактними даними
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
            <ImageIcon className="w-4 h-4 text-slate-600" /> Візуальні матеріали (Cloudflare R2)
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

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <label className="cursor-pointer px-4 py-2 bg-white/95 text-slate-800 rounded-xl text-xs font-semibold hover:bg-white shadow-md flex items-center gap-2 transition-transform hover:scale-105">
                  <Upload className="w-4 h-4 text-blue-600" />
                  {isUploadingBanner ? 'Завантаження...' : 'Завантажити новий банер'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingBanner}
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </label>
              </div>
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

              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                  <Upload className="w-4 h-4 text-blue-600" />
                  {isUploadingLogo ? 'Завантаження...' : 'Обрати новий логотип'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingLogo}
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  Підтримуються формати PNG, JPEG, SVG та WebP до 10 МБ
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Info Form */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-600" /> Основні дані та реквізити
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Назва магазину</label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Адреса (місто, вулиця)</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="м. Київ, вул. Хрещатик, 1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Контактний телефон</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email для сповіщень</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shop@bizx.ua"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Опис магазину</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Короткий опис діяльності для покупців..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Збереження...' : 'Зберегти зміни'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
