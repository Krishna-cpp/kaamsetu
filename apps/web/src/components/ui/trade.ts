import type { Skill } from '@kaamsetu/core';

/** Earthy, site-signage palette per trade (bg, fg). Kept inside the High-Vis Editorial language. */
export const TRADE_COLORS: Record<Skill, { bg: string; fg: string }> = {
  plumber: { bg: '#2F5D62', fg: '#F3EFE6' },
  electrician: { bg: '#FFD23F', fg: '#121210' },
  mason: { bg: '#A0522D', fg: '#F3EFE6' },
  painter: { bg: '#FF5B14', fg: '#121210' },
  carpenter: { bg: '#7A5C3A', fg: '#F3EFE6' },
  tile_fitter: { bg: '#5F6B73', fg: '#F3EFE6' },
  welder: { bg: '#3B3B36', fg: '#FFD23F' },
  ac_technician: { bg: '#B9C7C9', fg: '#121210' },
  driver: { bg: '#121210', fg: '#FFD23F' },
  delivery: { bg: '#D94400', fg: '#F3EFE6' },
  cook: { bg: '#C9A227', fg: '#121210' },
  domestic: { bg: '#8C8A84', fg: '#121210' },
  helper: { bg: '#5E6B3A', fg: '#F3EFE6' },
  security_guard: { bg: '#1D1D1A', fg: '#F3EFE6' },
};

export const tradeColor = (s: Skill | undefined) => (s ? TRADE_COLORS[s] : TRADE_COLORS.helper);
