"use client";
import { useTheme } from './ThemeProvider';
import MapleLeaves from './MapleLeaves';
import TwinkleStars from './TwinkleStars';

// 日间：枫叶飘落 + 金粉飘散；夜间：星点闪烁 + 偶发流星
// 两个 canvas 始终挂载（避免 SSR/客户端结构不一致），只让当前主题那个跑动画。
export default function BackgroundEffects() {
  const { isDark } = useTheme();

  return (
    <>
      <MapleLeaves active={!isDark} />
      <TwinkleStars active={isDark} />
    </>
  );
}