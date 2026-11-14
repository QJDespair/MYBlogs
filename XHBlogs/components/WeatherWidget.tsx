// components/WeatherWidget.tsx
"use client";

import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Snowflake, CloudLightning, Loader2, Wind, CloudOff } from 'lucide-react';

type Weather = { city: string; temp: number | null; text: string; icon: string; isMock: boolean };

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather', { cache: 'no-store' });
        const data = await res.json();

        // 和风 V7：数据在 data.now 中
        if (data.code === '200' && data.now) {
          setWeather({
            city: data.cityName || '本地',
            temp: parseInt(data.now.temp),
            text: data.now.text,
            icon: data.now.icon,
            isMock: false,
          });
        } else {
          // 不伪造温度：只显示未就绪状态（凭据/Host 未配置时就是这个分支）
          setWeather({ city: data?.cityName || '本地', temp: null, text: data?.message || '天气服务未就绪', icon: 'offline', isMock: true });
        }
      } catch {
        setWeather({ city: '本地', temp: null, text: '天气服务未就绪', icon: 'offline', isMock: true });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const getWeatherIcon = (iconCode: string) => {
    if (iconCode === 'offline') return <CloudOff className="text-slate-400" size={38} />;
    const code = parseInt(iconCode);
    if (code === 100) return <Sun className="text-amber-400" size={38} />;
    if (code >= 101 && code <= 104) return <Cloud className="text-slate-300" size={38} />;
    if (code >= 300 && code <= 399) return <CloudRain className="text-blue-400" size={38} />;
    if (code >= 400 && code <= 499) return <Snowflake className="text-orange-200" size={38} />;
    if (code >= 150 && code <= 153) return <Sun className="text-orange-200" size={38} />; // 夜间晴/多云
    return <Cloud className="text-slate-400" size={38} />;
  };

  return (
    <div className="w-full h-full rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-6 flex flex-col justify-center transition-all duration-700 hover:scale-[1.02] group relative overflow-hidden">
      <div className={`absolute -right-6 -top-6 w-32 h-32 blur-3xl rounded-full transition-colors duration-700 ${weather?.isMock ? 'bg-slate-500/20 group-hover:bg-slate-500/30' : 'bg-orange-500/20 group-hover:bg-orange-500/40'}`}></div>
      {loading ? (
        <div className="flex flex-col items-center gap-3 text-slate-500 w-full justify-center relative z-10">
          <Loader2 className="animate-spin text-amber-400" size={28} />
          <span className="text-[10px] font-black tracking-widest uppercase">同步 V7 气象云...</span>
        </div>
      ) : weather && (
        <div className="flex items-center justify-between relative z-10 w-full">
          <div className="flex flex-col flex-1 pr-2">
            <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${weather.isMock ? 'text-slate-400' : 'text-orange-500 dark:text-amber-400'}`}>
              {weather.isMock ? 'WEATHER OFFLINE' : 'LIVE · V7'}
            </span>
            <span className="text-base font-bold text-slate-800 dark:text-white line-clamp-1">{weather.city}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                {weather.temp === null ? '—' : `${weather.temp}°`}
              </span>
              <span className="text-xs font-bold text-slate-500 line-clamp-1">{weather.text}</span>
            </div>
          </div>
          <div className="relative z-10 group-hover:scale-110 transition-transform duration-500 drop-shadow-md">
            {getWeatherIcon(weather.icon)}
          </div>
        </div>
      )}
    </div>
  );
}