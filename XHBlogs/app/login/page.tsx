'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!key.trim()) {
      setError('先输入密钥');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/blog/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
      if (!res.ok || !data.ok) {
        setError(data.error || '登录失败');
        setBusy(false);
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next');
      const target = next && next.startsWith('/') ? next : '/';
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-50 via-amber-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-300/30 blur-3xl -z-10" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-amber-300/30 blur-3xl -z-10" />

      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-orange-100 dark:border-slate-700 shadow-xl shadow-orange-500/10 px-6 py-8 space-y-5"
      >
        <div className="text-center space-y-1">
          <div className="text-3xl">🍂</div>
          <h1 className="text-lg font-black text-slate-800 dark:text-slate-100">后台登录</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            输入密钥后回到博客，就能在「说说」「照片墙」里直接发布
          </p>
        </div>

        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="发布密钥"
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-xl border border-orange-100 dark:border-slate-700 bg-orange-50/50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-100 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/20"
        />

        {error && <p className="text-xs text-red-600 text-center">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-black disabled:opacity-60"
        >
          {busy ? '验证中…' : '登录'}
        </button>

        <button
          type="button"
          onClick={() => router.replace('/')}
          className="w-full py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-orange-600"
        >
          回博客首页
        </button>
      </form>
    </div>
  );
}