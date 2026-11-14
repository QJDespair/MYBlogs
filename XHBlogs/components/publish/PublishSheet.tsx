'use client';

import { ReactNode, useEffect } from 'react';

/** 发布弹窗外壳：手机全屏、桌面居中卡片，Esc 关闭 */
export default function PublishSheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-orange-100 dark:border-slate-700">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-orange-100 dark:border-slate-700">
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
        {footer ? (
          <div className="sticky bottom-0 px-5 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-orange-100 dark:border-slate-700">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}