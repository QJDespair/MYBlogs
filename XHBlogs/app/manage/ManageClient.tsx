'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Uploaded = { url: string; size: number; name: string };
type Photo = { url: string; caption?: string };
type Album = { id: string; title: string; description: string; cover: string; date: string; photos: Photo[] };
type Tab = 'moment' | 'album' | 'upload';

const TOKEN_KEY = 'qj-blog-token';

function todayShanghai(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
}

function humanSize(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

export default function ManageClient() {
  const [token, setToken] = useState('');
  const [tab, setTab] = useState<Tab>('moment');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [uploads, setUploads] = useState<Uploaded[]>([]);

  const [momentText, setMomentText] = useState('');
  const [momentLocation, setMomentLocation] = useState('');
  const [momentDate, setMomentDate] = useState(todayShanghai());
  const [momentImages, setMomentImages] = useState<string[]>([]);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumDate, setAlbumDate] = useState(todayShanghai());
  const [albumPhotos, setAlbumPhotos] = useState<string[]>([]);
  const [addTarget, setAddTarget] = useState('');
  const [addPhotos, setAddPhotos] = useState<string[]>([]);

  const [publishState, setPublishState] = useState<string>('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_KEY) || '';
    if (saved) setToken(saved);
  }, []);

  const auth = useCallback(
    (t: string) => ({ 'x-blog-token': t, 'content-type': 'application/json' }),
    [],
  );

  const flash = (text: string, isError = false) => {
    if (isError) {
      setErr(text);
      setNote('');
    } else {
      setNote(text);
      setErr('');
    }
  };

  const loadAlbums = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/blog/album', { headers: { 'x-blog-token': token }, cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setAlbums(json.albums as Album[]);
        if (!addTarget && json.albums.length > 0) setAddTarget((json.albums[0] as Album).id);
      } else {
        flash(String(json.error || '读取相册失败'), true);
      }
    } catch (e) {
      flash(`读取相册出错：${(e as Error).message}`, true);
    }
  }, [token, addTarget]);

  useEffect(() => {
    if (token) void loadAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!token) return flash('先填令牌', true);
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append('file', f);
      const res = await fetch('/api/blog/upload', { method: 'POST', headers: { 'x-blog-token': token }, body: fd });
      const json = await res.json();
      if (json.ok) {
        const list = json.files as Uploaded[];
        setUploads((prev) => [...list, ...prev]);
        flash(`已上传 ${list.length} 张`);
      } else {
        flash(String(json.error || '上传失败'), true);
      }
    } catch (e) {
      flash(`上传出错：${(e as Error).message}`, true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function postMoment() {
    if (!token) return flash('先填令牌', true);
    if (!momentText.trim()) return flash('说说内容不能为空', true);
    setBusy(true);
    try {
      const res = await fetch('/api/blog/moment', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({
          content: momentText,
          location: momentLocation,
          date: momentDate,
          images: momentImages,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        flash(`说说已保存：${json.file}（${json.images} 张图）`);
        setMomentText('');
        setMomentLocation('');
        setMomentImages([]);
      } else {
        flash(String(json.error || '保存失败'), true);
      }
    } catch (e) {
      flash(`保存出错：${(e as Error).message}`, true);
    } finally {
      setBusy(false);
    }
  }

  async function createAlbum() {
    if (!token) return flash('先填令牌', true);
    if (!albumTitle.trim()) return flash('相册标题不能为空', true);
    setBusy(true);
    try {
      const res = await fetch('/api/blog/album', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({
          action: 'create',
          title: albumTitle,
          description: albumDesc,
          date: albumDate,
          cover: albumPhotos[0] || '',
          photos: albumPhotos,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        flash(`相册「${(json.album as Album).title}」已建，${(json.album as Album).photos.length} 张`);
        setAlbumTitle('');
        setAlbumDesc('');
        setAlbumPhotos([]);
        await loadAlbums();
      } else {
        flash(String(json.error || '建相册失败'), true);
      }
    } catch (e) {
      flash(`建相册出错：${(e as Error).message}`, true);
    } finally {
      setBusy(false);
    }
  }

  async function addToAlbum() {
    if (!token) return flash('先填令牌', true);
    if (!addTarget) return flash('先选一个相册', true);
    if (addPhotos.length === 0) return flash('没有照片可加', true);
    setBusy(true);
    try {
      const res = await fetch('/api/blog/album', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ action: 'addPhotos', id: addTarget, photos: addPhotos }),
      });
      const json = await res.json();
      if (json.ok) {
        flash(`已加 ${json.added} 张到「${(json.album as Album).title}」`);
        setAddPhotos([]);
        await loadAlbums();
      } else {
        flash(String(json.error || '加照片失败'), true);
      }
    } catch (e) {
      flash(`加照片出错：${(e as Error).message}`, true);
    } finally {
      setBusy(false);
    }
  }

  async function removeAlbum(id: string) {
    if (!token) return flash('先填令牌', true);
    if (!window.confirm('删除这个相册？（照片文件不会删）')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/blog/album', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ action: 'delete', id }),
      });
      const json = await res.json();
      if (json.ok) {
        flash('相册已删');
        await loadAlbums();
      } else {
        flash(String(json.error || '删除失败'), true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!token) return flash('先填令牌', true);
    setBusy(true);
    setPublishState('已提交，正在构建（约 60 秒）…');
    try {
      const res = await fetch('/api/blog/publish', { method: 'POST', headers: { 'x-blog-token': token } });
      const json = await res.json();
      if (!json.ok) {
        setPublishState('');
        flash(String(json.error || '提交失败'), true);
        return;
      }
      for (let i = 0; i < 40; i += 1) {
        await new Promise((r) => setTimeout(r, 3000));
        const st = await fetch('/api/blog/publish', { headers: { 'x-blog-token': token }, cache: 'no-store' });
        const sj = await st.json();
        const s = sj.state as { state?: string; build?: number; push?: string; http?: string; at?: string } | null;
        if (s?.state) {
          setPublishState(`状态：${s.state}｜build 退出码 ${s.build}｜push ${s.push}｜站点 ${s.http}｜${s.at}`);
          if (s.state === 'done' || s.state === 'build_failed') break;
        }
      }
    } catch (e) {
      flash(`提交出错：${(e as Error).message}`, true);
    } finally {
      setBusy(false);
    }
  }

  const addableImages = uploads.map((u) => u.url);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">在线发布台</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              手机或电脑都能用 · 说说与相册直接写进服务器 · 图片存 /uploads/
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:border-orange-500 hover:text-orange-600 dark:border-slate-700"
            >
              看站点
            </a>
            <button
              type="button"
              onClick={publish}
              disabled={busy}
              className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              上线（构建+重启）
            </button>
          </div>
        </header>

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">访问令牌</label>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="粘贴服务器上的 BLOG_ADMIN_TOKEN"
              className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(TOKEN_KEY, token);
                flash('令牌已存在本机浏览器');
                void loadAlbums();
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:border-orange-500 dark:border-slate-700"
            >
              保存
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {(
            [
              ['moment', '发说说'],
              ['album', '相册'],
              ['upload', '传图片'],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-lg px-4 py-2 text-xs font-bold ${
                tab === k
                  ? 'bg-orange-600 text-white'
                  : 'border border-slate-300 text-slate-600 hover:border-orange-500 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {note && (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            {note}
          </div>
        )}
        {err && (
          <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
            {err}
          </div>
        )}
        {publishState && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {publishState}
          </div>
        )}

        {tab === 'moment' && (
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <textarea
              value={momentText}
              onChange={(e) => setMomentText(e.target.value)}
              rows={5}
              placeholder="这一刻想说的话…"
              className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={momentLocation}
                onChange={(e) => setMomentLocation(e.target.value)}
                placeholder="地点（可留空）"
                className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700"
              />
              <input
                type="date"
                value={momentDate}
                onChange={(e) => setMomentDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700"
              />
            </div>
            <ImagePicker
              token={token}
              value={momentImages}
              onChange={setMomentImages}
              hint={addableImages}
              onUploaded={(list) => setUploads((prev) => [...list, ...prev])}
            />
            <button
              type="button"
              onClick={postMoment}
              disabled={busy}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              保存说说
            </button>
          </section>
        )}

        {tab === 'album' && (
          <section className="space-y-4">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-black">新建相册</h2>
              <input
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="相册标题"
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700"
              />
              <input
                value={albumDesc}
                onChange={(e) => setAlbumDesc(e.target.value)}
                placeholder="一句描述（可留空）"
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700"
              />
              <input
                type="date"
                value={albumDate}
                onChange={(e) => setAlbumDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700"
              />
              <ImagePicker
                token={token}
                value={albumPhotos}
                onChange={setAlbumPhotos}
                hint={addableImages}
                onUploaded={(list) => setUploads((prev) => [...list, ...prev])}
              />
              <button
                type="button"
                onClick={createAlbum}
                disabled={busy}
                className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                建相册
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-black">往已有相册加照片</h2>
              <select
                value={addTarget}
                onChange={(e) => setAddTarget(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700"
              >
                <option value="">— 选择相册 —</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}（{a.photos?.length || 0} 张）
                  </option>
                ))}
              </select>
              <ImagePicker
                token={token}
                value={addPhotos}
                onChange={setAddPhotos}
                hint={addableImages}
                onUploaded={(list) => setUploads((prev) => [...list, ...prev])}
              />
              <button
                type="button"
                onClick={addToAlbum}
                disabled={busy}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
              >
                加进相册
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 text-sm font-black">现有相册（{albums.length}）</h2>
              {albums.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">还没有相册，上面建一个。</p>
              )}
              <ul className="space-y-2">
                {albums.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{a.title}</p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {a.date} · {a.photos?.length || 0} 张 · {a.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAlbum(a.id)}
                      className="shrink-0 rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950"
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {tab === 'upload' && (
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-black">传图片到服务器</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              支持 jpg/png/webp/gif/avif/heic，单张 ≤ 20MB。手机上会直接调相机或相册。
            </p>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-10 text-center text-xs text-slate-500 hover:border-orange-500 hover:text-orange-600 dark:border-slate-700">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => void uploadFiles(e.target.files)}
                className="hidden"
              />
              点这里选图片（可多选）
            </label>
            {uploads.length > 0 && (
              <ul className="space-y-2">
                {uploads.map((u) => (
                  <li key={u.url} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.url} alt={u.name} className="h-12 w-12 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-mono">{u.url}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{humanSize(u.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(`${window.location.origin}${u.url}`);
                        flash('直链已复制');
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold dark:border-slate-700"
                    >
                      复制直链
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="mt-8 text-center text-[11px] text-slate-400">
          内容写进 /srv/blog/XHBlogs，图片进 /var/www/blog-uploads；点「上线」才对外可见。
        </p>
      </div>
    </div>
  );
}

function ImagePicker({
  token,
  value,
  onChange,
  hint,
  onUploaded,
}: {
  token: string;
  value: string[];
  onChange: (next: string[]) => void;
  hint: string[];
  onUploaded: (list: Uploaded[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [manual, setManual] = useState('');
  const [localErr, setLocalErr] = useState('');
  const [working, setWorking] = useState(false);

  async function doUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!token) {
      setLocalErr('先填令牌');
      return;
    }
    setWorking(true);
    setLocalErr('');
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append('file', f);
      const res = await fetch('/api/blog/upload', { method: 'POST', headers: { 'x-blog-token': token }, body: fd });
      const json = await res.json();
      if (json.ok) {
        const list = json.files as Uploaded[];
        onUploaded(list);
        onChange([...value, ...list.map((x) => x.url)]);
      } else {
        setLocalErr(String(json.error || '上传失败'));
      }
    } catch (e) {
      setLocalErr((e as Error).message);
    } finally {
      setWorking(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold hover:border-orange-500 hover:text-orange-600 dark:border-slate-700">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => void doUpload(e.target.files)}
            className="hidden"
          />
          {working ? '上传中…' : '上传图片'}
        </label>
        {hint.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([...value, ...hint.filter((h) => !value.includes(h))])}
            className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold dark:border-slate-700"
          >
            加入刚传的 {hint.length} 张
          </button>
        )}
        <span className="text-[11px] text-slate-500 dark:text-slate-400">已选 {value.length} 张</span>
      </div>

      <div className="flex gap-2">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="或粘贴图片直链 /uploads/…"
          className="flex-1 rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 text-[11px] outline-none focus:border-orange-500 dark:border-slate-700"
        />
        <button
          type="button"
          onClick={() => {
            const u = manual.trim();
            if (!u) return;
            onChange([...value, u]);
            setManual('');
          }}
          className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold dark:border-slate-700"
        >
          加
        </button>
      </div>

      {localErr && <p className="text-[11px] text-rose-600">{localErr}</p>}

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((u, i) => (
            <li key={`${u}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-16 w-16 rounded object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white"
                aria-label="移除"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}