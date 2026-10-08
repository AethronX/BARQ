import Svg, { Circle, Path } from 'react-native-svg';
import { useI18n } from '../i18n/I18nProvider';
import { colors } from './theme';

/** Stroke icons in a 24-unit box. Directional icons mirror automatically in RTL. */
const PATHS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  bell: 'M6 9a6 6 0 1112 0c0 6.5 2.5 8 2.5 8h-17S6 15.5 6 9 M10 20.5a2.2 2.2 0 004 0',
  chevronStart: 'M15 5l-7 7 7 7',
  chevronEnd: 'M9 5l7 7-7 7',
  arrowEnd: 'M5 12h14M13 6l6 6-6 6',
  doc: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z M14 3v5h5M9 13h6M9 17h4',
  docPlus: 'M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h5 M13 3v5h5v4M9 12h4M9 16h2 M18 15v6M15 18h6',
  clock: 'M12 3a9 9 0 110 18 9 9 0 010-18z M12 7v5l3 2',
  timer: 'M12 5a8 8 0 110 16 8 8 0 010-16z M12 9v4l2.5 1.5M10 2h4',
  chat: 'M4 5h16v11H9l-5 4z',
  users: 'M9 4.8a3.2 3.2 0 110 6.4 3.2 3.2 0 010-6.4z M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5 M17 6.6a2.4 2.4 0 110 4.8 2.4 2.4 0 010-4.8z M16 14.6c2.6.1 4.5 1.9 5 4.9',
  building: 'M4 21V5l8-2v18M12 8h8v13M4 21h17M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5M12 13v8',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z M12 7a2.5 2.5 0 110 5 2.5 2.5 0 010-5z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z M8.5 12l2.5 2.5 4.5-5',
  truck: 'M2.5 6.5h11v9.5h-11zM13.5 9.5h4.2l3.3 3.6v2.9h-7.5 M6.5 15.5a2 2 0 110 4 2 2 0 010-4z M17 15.5a2 2 0 110 4 2 2 0 010-4z',
  cal: 'M6 5h12a2.5 2.5 0 012.5 2.5v10.5a2.5 2.5 0 01-2.5 2.5H6a2.5 2.5 0 01-2.5-2.5V7.5A2.5 2.5 0 016 5z M3.5 10h17M8 3v4M16 3v4',
  trophy: 'M8 4h8v5a4 4 0 01-8 0zM8 6H4.5v1.5A3.5 3.5 0 008 11M16 6h3.5v1.5A3.5 3.5 0 0116 11M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z',
  dollar: 'M12 3a9 9 0 110 18 9 9 0 010-18z M14.8 9.2c-.4-1-1.5-1.7-2.8-1.7-1.6 0-2.8.9-2.8 2.1 0 2.9 5.8 1.6 5.8 4.6 0 1.2-1.3 2.2-3 2.2-1.4 0-2.6-.7-3-1.8M12 6v1.5M12 16.5V18',
  tag: 'M3 12V4h8l10 10-8 8z M7.5 6.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8 M16 5a2 2 0 110 4 2 2 0 010-4z M10 15a2 2 0 110 4 2 2 0 010-4z',
  funnel: 'M3.5 5h17l-6.5 7.5V19l-4 1.5v-8z',
  headset: 'M4 14v-2a8 8 0 0116 0v2 M3 13h4v6H3z M17 13h4v6h-4z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  checkCircle: 'M12 3a9 9 0 110 18 9 9 0 010-18z M8 12.5l2.7 2.7L16 9.8',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  down: 'M6 9l6 6 6-6',
  info: 'M12 3a9 9 0 110 18 9 9 0 010-18z M12 11v5M12 7.8h.01',
  warn: 'M12 3.5l9.5 16.5h-19z M12 10v4.5M12 17.2h.01',
  ship: 'M3 15.5l1.8 4h14.4l1.8-4-9-2.5zM6 14.5V9h12v5.5M9 9V6h6v3M12 3v3',
  globe: 'M12 3a9 9 0 110 18 9 9 0 010-18z M3 12h18M12 3c2.6 2.7 3.8 5.7 3.8 9s-1.2 6.3-3.8 9c-2.6-2.7-3.8-5.7-3.8-9S9.4 5.7 12 3z',
  cube: 'M21 8l-9-5-9 5 9 5zM3 8v8l9 5 9-5V8M12 13v8',
  bag: 'M6 8h12l1.5 12.5h-15zM9 8V6.5a3 3 0 016 0V8',
  home: 'M3.5 11L12 3.8l8.5 7.2 M5.5 9.5v10.5h13V9.5M10 20v-5.5h4V20',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  lock: 'M7 10.5h10a2.5 2.5 0 012.5 2.5v5a2.5 2.5 0 01-2.5 2.5H7A2.5 2.5 0 014.5 18v-5A2.5 2.5 0 017 10.5z M8 10.5V7.5a4 4 0 018 0v3',
  help: 'M12 3a9 9 0 110 18 9 9 0 010-18z M9.5 9.5a2.6 2.6 0 015 .8c0 1.8-2.5 2.2-2.5 3.7M12 17h.01',
  camera: 'M4 8h3l1.5-2.5h7L17 8h3v11.5H4z M12 10a3.5 3.5 0 110 7 3.5 3.5 0 010-7z',
  activity: 'M3 12h4l3-7 4 14 3-7h4',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
} as const;

export type IconName = keyof typeof PATHS | 'bolt' | 'star';

const MIRRORED: ReadonlySet<IconName> = new Set(['chevronStart', 'chevronEnd', 'arrowEnd']);
const THICK: ReadonlySet<IconName> = new Set(['dots', 'list', 'check', 'chevronStart', 'chevronEnd', 'plus', 'minus']);

export function Icon({ name, size = 22, color = colors.ink2, strokeWidth }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const { isRTL } = useI18n();
  const flip = MIRRORED.has(name) && isRTL ? { transform: [{ scaleX: -1 }] } : undefined;
  if (name === 'bolt') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M13.5 2L4.5 13.5h6.5L9.5 22l9.5-12.5h-6.5z" fill={color} />
      </Svg>
    );
  }
  if (name === 'star') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={flip}>
      <Path
        d={PATHS[name]}
        stroke={color}
        strokeWidth={strokeWidth ?? (THICK.has(name) ? 2.4 : 1.8)}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Blue rosette shown only for business- or fully-verified suppliers. */
export function VerifiedBadge({ size = 17 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 1.8l2.4 1.8 3-.2.9 2.9 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-.9 2.9-3-.2L12 20.2l-2.4-1.8-3 .2-.9-2.9-2.5-1.7.9-2.9-.9-2.9 2.5-1.7.9-2.9 3 .2z"
        fill={colors.blue}
      />
      <Path d="M8.2 11.8l2.5 2.5 5-5" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Brand Q: amber ring with a lightning tail. */
export function QMark({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={19} cy={19} r={13} fill="none" stroke={colors.amber} strokeWidth={6} />
      <Path d="M27 21l-7 6h5l-3 9 11-11h-6l3-4z" fill={colors.amber} stroke={colors.navy} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

