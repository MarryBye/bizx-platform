import React from 'react';
import { Card, CardContent, Badge } from '@bizx/ui';
import { LucideIcon, Sparkles } from 'lucide-react';

interface PlaceholderViewProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  title,
  description,
  icon: Icon,
  badge = 'У розробці'
}) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            {badge}
          </Badge>
        </div>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <Card className="border-dashed border-slate-300 p-12 text-center bg-slate-50/50">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Icon className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Модуль готується до релізу</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Цей функціонал заплановано у дорожній карті розвитку платформи BizX. Наразі база даних та API
          готові до інтеграції відповідних сервісів.
        </p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> Заплановано на наступний реліз
        </div>
      </Card>
    </div>
  );
};
