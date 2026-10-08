import React from 'react';
import { Button } from '@bizx/ui';

export default function HomePage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          BizX Landing (Next.js 15)
        </h1>
        <p className="text-lg text-muted-foreground">
          Чистый стартовый шаблон лендинга с SSR, Tailwind CSS и общей дизайн-системой из @bizx/ui.
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="default">Пример кнопки из @bizx/ui</Button>
          <Button variant="outline">Вторая кнопка</Button>
        </div>
      </div>
    </main>
  );
}
