'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublishSheet from './PublishSheet';
import {
  albumAction,
  requestPublish,
  todayShanghai,
  uploadFiles,
  waitForPublish,
  type PublishState,
} from './publishApi';

type Item = { file: File; preview: string; caption: string };

export default function AlbumPublisher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayShanghai());
  const [items, setItems] = useState<Item[]>([]);
  const [coverIdx, setCoverIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function reset() {
    setTitle('');
    setDescription('');
    setDate(todayShanghai());
    setItems((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
    setCoverIdx(0);
    setBusy(false);
    setStage('');
    setError('');
    setDone(false);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: Item[] = [];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue;
      next.push({ file, preview: URL.createObjectURL(file), caption: '' });
    }
    setItems((prev) => [...prev, ...next]);
  }

  function removeAt(i: number) {
    setItems((prev) => {
      const copy = [...prev];
      const [gone] = copy.splice(i, 1);
      if (gone) URL.revokeObjectURL(gone.preview);
      return copy;
    });
    setCoverIdx((prev) => (prev === i ? 0 : prev > i ? prev - 1 : prev));
  }

  function setCaption(i: number, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, caption: value } : it)));
  }

  async function submit() {
    if (busy) return;
    if (!title.trim()) {
      setError('给相册起个标题');
      return;
    }
    if (items.length === 0) {
      setError('至少放一张照片');
      return;
    }
    setBusy(true);
    setError('');
    try {
      setStage(`上传 ${items.length} 张照片…`);
      const uploaded = await uploadFiles(items.map((it) => it.file));
      const photos = uploaded.map((u, i) => ({
        url: u.url,
        ...(items[i]?.caption.trim() ? { caption: items[i].caption.trim() } : {}),
      }));
      const cover = photos[Math.min(coverIdx, photos.length - 1)]?.url || photos[0].url;

      setStage('写入相册数据…');
      await albumAction({ action: 'create', title: title.trim(), description: description.trim(), date, cover, photos });
      setStage('正在排队构建…');
      await requestPublish();
      setStage('站点重新构建中，通常 1 分钟内完成…');
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
        aria-label="建相册"
      >
        <span className="text-base leading-none">▣</span>
        建相册
      </button>

      <PublishSheet
        open={open}
        title="新建一个相册"
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
              {busy ? '处理中…' : done ? '已完成' : '创建并上线'}
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
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="相册标题，例如：周末的南京"
          className="w-full rounded-xl border border-orange-100 dark:border-slate-700 bg-orange-50/40 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none focus:border-orange-400"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="一句话描述（可不填）"
          className="w-full resize-y rounded-xl border border-orange-100 dark:border-slate-700 bg-orange-50/40 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none focus:border-orange-400"
        />
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">拍摄日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-orange-100 dark:border-slate-700 bg-orange-50/40 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-orange-300 text-orange-600 dark:text-amber-400 text-xs font-bold cursor-pointer hover:bg-orange-50 dark:hover:bg-slate-800">
            + 添加照片
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
          {items.length > 0 && (
            <div className="mt-3 space-y-2">
              {items.map((it, i) => (
                <div key={it.preview} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.preview} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  <input
                    value={it.caption}
                    onChange={(e) => setCaption(i, e.target.value)}
                    placeholder="这张照片的说明（可不填）"
                    className="flex-1 min-w-0 rounded-lg border border-orange-100 dark:border-slate-700 bg-orange-50/40 dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-100 outline-none focus:border-orange-400"
                  />
                  <button
                    onClick={() => setCoverIdx(i)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold shrink-0 ${
                      coverIdx === i
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {coverIdx === i ? '封面' : '设为封面'}
                  </button>
                  <button
                    onClick={() => removeAt(i)}
                    className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs shrink-0"
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
        {done && (
          <p className="text-xs text-emerald-600 font-bold">相册已上线，点「刷新查看」就能看到。</p>
        )}
      </PublishSheet>
    </>
  );
}