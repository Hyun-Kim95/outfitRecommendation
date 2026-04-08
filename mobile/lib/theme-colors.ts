/** Graphite (tweakcn) 팔레트 — RN은 oklch 미지원이라 sRGB hex 근사값 */

export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  inputBg: string;
  inputBorder: string;
  chipBg: string;
  chipOnBg: string;
  chipText: string;
  chipTextOn: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabInactive: string;
  star: string;
  starEmpty: string;
  warning: string;
  warningBg: string;
  warningText: string;
  infoBg: string;
  infoText: string;
  activityIndicator: string;
  headerTint: string;
};

export const lightColors: ThemeColors = {
  background: '#f3f3f4',
  foreground: '#505050',
  card: '#f7f7f8',
  cardForeground: '#505050',
  muted: '#e5e5e6',
  mutedForeground: '#737373',
  border: '#dbdbdc',
  primary: '#717171',
  primaryForeground: '#ffffff',
  secondary: '#e8e8e9',
  secondaryForeground: '#505050',
  accent: '#d0d0d1',
  accentForeground: '#505050',
  destructive: '#c94c4c',
  inputBg: '#f7f7f8',
  inputBorder: '#dbdbdc',
  chipBg: '#e5e5e6',
  chipOnBg: '#d0d0d1',
  chipText: '#525252',
  chipTextOn: '#3a3a3a',
  tabBarBg: '#f7f7f8',
  tabBarBorder: '#dbdbdc',
  tabInactive: '#737373',
  star: '#ca8a04',
  starEmpty: '#d4d4d8',
  warning: '#b45309',
  warningBg: '#fef3c7',
  warningText: '#92400e',
  infoBg: '#e0f2fe',
  infoText: '#0369a1',
  activityIndicator: '#717171',
  headerTint: '#5a5a5a',
};

export const darkColors: ThemeColors = {
  background: '#383838',
  foreground: '#e2e2e2',
  card: '#3e3e3e',
  cardForeground: '#e2e2e2',
  muted: '#454545',
  mutedForeground: '#9a9a9a',
  border: '#535353',
  primary: '#bcbcbc',
  primaryForeground: '#383838',
  secondary: '#4a4a4a',
  secondaryForeground: '#e2e2e2',
  accent: '#5e5e5e',
  accentForeground: '#e2e2e2',
  destructive: '#e07070',
  inputBg: '#454545',
  inputBorder: '#535353',
  chipBg: '#4a4a4a',
  chipOnBg: '#5e5e5e',
  chipText: '#d4d4d4',
  chipTextOn: '#f0f0f0',
  tabBarBg: '#3e3e3e',
  tabBarBorder: '#535353',
  tabInactive: '#9a9a9a',
  star: '#fbbf24',
  starEmpty: '#6b7280',
  warning: '#fbbf24',
  warningBg: '#451a03',
  warningText: '#fcd34d',
  infoBg: '#0c4a6e',
  infoText: '#7dd3fc',
  activityIndicator: '#bcbcbc',
  headerTint: '#d4d4d4',
};
