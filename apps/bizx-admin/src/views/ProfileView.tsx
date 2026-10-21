import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@bizx/ui';
import { User, Phone, Mail, Shield, Upload, Check, AlertCircle } from 'lucide-react';
import { resolveMediaUrl } from '../lib/media';

export const ProfileView: React.FC = () => {
  const { user, updateProfile, updateAvatar, isLoading } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-500">
        Користувач не авторизований
      </div>
    );
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setIsUploadingAvatar(true);
    setStatusMessage(null);

    try {
      const ok = await updateAvatar(file);
      if (ok) {
        setStatusMessage({ text: 'Аватар успішно оновлено!' });
      } else {
        setStatusMessage({ text: 'Не вдалося завантажити фото', isError: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Помилка завантаження фото';
      setStatusMessage({ text: msg, isError: true });
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const ok = await updateProfile({
      name: name.trim(),
      phone: phone.trim() || undefined
    });

    if (ok) {
      setStatusMessage({ text: 'Особисті дані успішно збережено!' });
    } else {
      setStatusMessage({ text: 'Помилка збереження профілю', isError: true });
    }
  };

  const getInitials = (userName: string) => {
    return userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  };

  const currentAvatarUrl = avatarPreview || resolveMediaUrl(user.avatarUrl);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Профіль користувача</h1>
        <p className="text-sm text-slate-500 mt-1">
          Керуйте особистою інформацією, контактним номером та фотографією профілю
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

      {/* Avatar Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600" /> Фотографія профілю
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-900 text-white border-2 border-white shadow-sm flex items-center justify-center text-xl font-bold overflow-hidden shrink-0">
              {currentAvatarUrl && !avatarError ? (
                <img
                  src={currentAvatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span>{getInitials(user.name) || 'U'}</span>
              )}
            </div>

            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                {isUploadingAvatar ? 'Завантаження...' : 'Завантажити нове фото'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingAvatar}
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Рекомендовано квадратне фото у форматі JPG, PNG або WebP
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info Form */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-600" /> Особисті дані
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Ім&apos;я та прізвище *</label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Олександр Коваленко"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Контактний телефон</label>
                <div className="relative">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+380..."
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email (не змінюється)</label>
                <Input
                  disabled
                  value={user.email}
                  className="bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Роль в системі</label>
                <div className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Власник бізнесу</span>
                  <Badge variant="default" className="text-[10px]">
                    Owner
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="submit" disabled={isLoading || isUploadingAvatar}>
                {isLoading ? 'Збереження...' : 'Зберегти зміни'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
