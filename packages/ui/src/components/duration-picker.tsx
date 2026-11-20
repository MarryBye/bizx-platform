import * as React from 'react';
import { cn } from '../lib/utils';

export interface DurationPickerProps {
  value: number | null;
  onChange: (days: number | null) => void;
  label?: string;
  locale?: 'uk' | 'en';
  className?: string;
}

const PRESETS: Array<{ value: number | null; uk: string; en: string }> = [
  { value: 3, uk: '3 дні', en: '3 days' },
  { value: 7, uk: '7 днів', en: '7 days' },
  { value: 14, uk: '14 днів', en: '14 days' },
  { value: 30, uk: '30 днів', en: '30 days' },
  { value: 90, uk: '90 днів', en: '90 days' },
  { value: null, uk: 'Назавжди', en: 'Indefinitely' }
];

export const DurationPicker: React.FC<DurationPickerProps> = ({
  value,
  onChange,
  label,
  locale = 'uk',
  className
}) => {
  const isPresetValue = PRESETS.some((p) => p.value === value);
  const [customMode, setCustomMode] = React.useState(!isPresetValue);
  const [customText, setCustomText] = React.useState(
    !isPresetValue && value ? String(value) : '10'
  );

  React.useEffect(() => {
    if (PRESETS.some((p) => p.value === value)) {
      setCustomMode(false);
    }
  }, [value]);

  const handleCustomChange = (raw: string) => {
    setCustomText(raw);
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      onChange(Math.min(3650, parsed));
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-xs font-bold text-slate-800 block">{label}</label>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {PRESETS.map((opt) => {
          const active = !customMode && value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                setCustomMode(false);
                onChange(opt.value);
              }}
              className={cn(
                'px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors text-center cursor-pointer',
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              )}
            >
              {locale === 'en' ? opt.en : opt.uk}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setCustomMode(true);
            const parsed = parseInt(customText, 10);
            onChange(Number.isFinite(parsed) && parsed >= 1 ? Math.min(3650, parsed) : 10);
          }}
          className={cn(
            'px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors text-center cursor-pointer',
            customMode
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          )}
        >
          {locale === 'en' ? 'Custom' : 'Свій термін'}
        </button>
      </div>

      {customMode && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min={1}
            max={3650}
            value={customText}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="w-28 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 font-bold"
          />
          <span className="text-xs text-slate-500">{locale === 'en' ? 'days' : 'днів'}</span>
        </div>
      )}
    </div>
  );
};
