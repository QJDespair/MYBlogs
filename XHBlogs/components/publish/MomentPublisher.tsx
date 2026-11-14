'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublishSheet from './PublishSheet';
import {
  postMoment,
  requestPublish,
  uploadFiles,
  waitForPublish,
  type PublishState,
} from './publishApi';

type Picked = { file: File; preview: string };

export default function MomentPublisher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function reset() {
    setContent('');
    setLocation('');
    setPicked((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
    setBusy(false);
    setStage('');
    setError('');
    setDone(false);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: Picked[] = [];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue;
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setPicked((prev) => [...prev, ...next]);
  }

  function removeAt(i: number) {
    setPicked((prev) => {
      const copy = [...prev];
      const [gone] = copy.splice(i, 1);
      if (gone) URL.revokeObjectURL(gone.preview);
      return copy;
    });
  }

  async function submit() {
    if (busy) return;
    if (!content.trim() && picked.length === 0) {
      setError('说点什么，或者至少放一张图');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let images: string[] = [];
      if (picked.length > 0) {
        setStage(`上传 ${picked.length} 张图片…`);
        const files = await uploadFiles(picked.map((p) => p.file));
        images = files.map((f) => f.url);
      }
      setStage('保存这条说说…');
      await postMoment({ content: content.trim(), location: location.trim() || undefined, images });
      setStage('正在排队构建…');
      await requestPublish();
      setStage('服务器正在重新构建站点，通常 1 分钟内完成…');
      const final = await waitForPublish((s: PublishState) => {
        if (s.state === 'building') setStage('构建中，站点会短暂不可用…');
      });
      if (final.state === 'done') {
        setDone(true);
        setStage(final.message || '已上线');
        router.refresh();
      } else {
        setError(final.message || '构建失败，去服务器看 /var/log/blog-apply.log');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="fixed bottom-6 right-5 z-[60] flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-black shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-transform"
        aria-label="发说说"
      >
        <span className="text-base leading-none">✎</span>
        发说说
      </button>

      <PublishSheet
        open={open}
        title="发一条说说"
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={busy || done}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-black disabled:opacity-60"
            >
              {busy ? '处理中…' : done ? '已完成' : '发布并上线'}
            </button>
            <button
              onClick={() => {
                if (!busy) setOpen(false);
                if (done) window.location.reload();
              }}
              className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold"
            >
              {done ? '刷新查看' : '取消'}
            </button>
          </div>
        }
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="此刻在想什么…"
          className="w-full resize-y rounded-xl border border-orange-100 dark:border-slate-700 bg-orange-50/40 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none focus:border-orange-400"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="地点（可不填）"
          className="w-full rounded-xl border border-orange-100 dark:border-slate-700 bg-orange-50/40 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none focus:border-orange-400"
        />

        <div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-orange-300 text-orange-600 dark:text-amber-400 text-xs font-bold cursor-pointer hover:bg-orange-50 dark:hover:bg-slate-800">
            + 添加图片
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.currentTarget.value = '';
              }}
            />
          </label>
          {picked.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {picked.map((p, i) => (
                <div key={p.preview} className="relative aspect-square rounded-lg overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeAt(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="移除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {stage && <p className="text-xs text-slate-500 dark:text-slate-400">{stage}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {done && <p className="text-xs text-emerald-600 font-bold">已上线，点「刷新查看」就能看到。</p>}
      </PublishSheet>
    </>
  );
}