"use client";

import { useEffect, useState } from 'react';
import { siteConfig } from '../siteConfig';

/** 把毫秒差格式化成「X天 X小时」 */
function formatUptime(diffMs: number) {
  const diff = Math.max(0, diffMs);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return days + '天 ' + hours + '小时';
}

/**
 * 首页底部状态条：只显示「系统已稳定运行：X天 X小时」。
 * 计时起点 = 首次部署到服务器的时刻（siteConfig.buildDate），不是系统开机时间。
 */
export default function SiteDashboard() {
  // 首次部署时刻（构建期常量）
  const startMs = new Date(siteConfig.buildDate || '2026-11-14T14:45:40+08:00').getTime();

  // 初值直接算好，服务端渲染就有正确数字，不会先闪一下空值
  const [uptimeStr, setUptimeStr] = useState(() => formatUptime(Date.now() - startMs));

  useEffect(() => {
    // 只显示到"小时"，一分钟刷一次足够，不必每秒重排
    const timer = setInterval(() => setUptimeStr(formatUptime(Date.now() - startMs)), 60000);
    return () => clearInterval(timer);
  }, [startMs]);

  return (
    <div className="md:col-span-12 rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl px-6 py-4 flex items-center justify-center text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors duration-700">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
      <span>
        系统已稳定运行：
        <span className="text-orange-600 dark:text-amber-400 font-black">{uptimeStr}</span>
      </span>
    </div>
  );
}
