/**
 * Small chart set drawn with react-native-svg, in the BARQ palette.
 *
 * A chart never invents a value: a day with no activity is drawn as zero
 * height, and a metric the server could not compute is handed to `Stat` as
 * null, which prints "لا بيانات" instead of a misleading 0.
 */
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useI18n } from '../i18n/I18nProvider';
import { Num, T } from './components';
import { Icon, type IconName } from './Icon';
import { colors } from './theme';

export function Stat({ label, value, unit, icon, tone }: { label: string; value: number | string | null; unit?: string; icon?: IconName; tone?: 'plain' | 'warn' | 'good' }) {
  const { t } = useI18n();
  const color = tone === 'warn' ? colors.amberText : tone === 'good' ? colors.green : colors.ink;
  return (
    <View style={{ flexGrow: 1, flexBasis: '45%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <Icon name={icon} size={15} color={colors.muted} /> : null}
        <T style={{ fontSize: 11.5, color: colors.muted, flex: 1 }} numberOfLines={2}>{label}</T>
      </View>
      {value == null ? (
        <T style={{ fontSize: 14, color: colors.muted }}>{t('no_data')}</T>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Num style={{ fontSize: 22, fontWeight: '700', color }}>{value}</Num>
          {unit ? <T style={{ fontSize: 11.5, color: colors.muted }}>{unit}</T> : null}
        </View>
      )}
    </View>
  );
}

/** Daily bars. Zero-activity days stay visible as a baseline tick. */
export function BarChart({ data, height = 110, color = colors.amber }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const { t } = useI18n();
  if (!data.length) return <T style={{ fontSize: 12, color: colors.muted }}>{t('no_data')}</T>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = 2;
  const w = 100 / data.length;
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = Math.max(1, (d.value / max) * (height - 2));
          return <Rect key={d.label} x={i * w + gap / 2} y={height - h} width={Math.max(0.5, w - gap)} height={h} rx={0.8} fill={d.value > 0 ? color : colors.line} />;
        })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', direction: 'ltr' }}>
        <Num style={{ fontSize: 10, color: colors.muted }}>{data[0].label}</Num>
        <Num style={{ fontSize: 10, color: colors.muted }}>{data[data.length - 1].label}</Num>
      </View>
    </View>
  );
}

/** Conversion funnel as proportional bars: every stage shows its own count. */
export function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const top = Math.max(stages[0]?.value ?? 0, 1);
  return (
    <View style={{ gap: 8 }}>
      {stages.map((s, i) => {
        const pct = Math.round((s.value / top) * 100);
        return (
          <View key={s.label} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T style={{ fontSize: 12.5 }}>{s.label}</T>
              <Num style={{ fontSize: 12.5, fontWeight: '700' }}>{`${s.value}  ${i === 0 ? '' : `(${pct}%)`}`}</Num>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.tile, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(pct, s.value > 0 ? 3 : 0)}%`, height: '100%', backgroundColor: i === stages.length - 1 ? colors.green : colors.navy }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Share of a whole, as a ring. Used for verification mix. */
export function Donut({ slices, size = 120 }: { slices: { label: string; value: number; color: string }[]; size?: number }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = 44;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={r} fill="none" stroke={colors.tile} strokeWidth={12} />
      {total > 0
        ? slices.map((s) => {
            const len = (s.value / total) * c;
            const el = <Circle key={s.label} cx={50} cy={50} r={r} fill="none" stroke={s.color} strokeWidth={12} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" strokeLinecap="butt" />;
            offset += len;
            return el;
          })
        : null}
    </Svg>
  );
}

export function Legend({ items }: { items: { label: string; value: number; color: string }[] }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {items.map((i) => (
        <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: i.color }} />
          <T style={{ fontSize: 12, flex: 1 }}>{i.label}</T>
          <Num style={{ fontSize: 12, fontWeight: '700' }}>{i.value}</Num>
        </View>
      ))}
    </View>
  );
}

/** Horizontal comparison rows (categories, suppliers). */
export function RankBars({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const { t } = useI18n();
  if (!rows.length) return <T style={{ fontSize: 12, color: colors.muted }}>{t('no_data')}</T>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T style={{ fontSize: 12.5, flex: 1 }} numberOfLines={1}>{r.label}</T>
            {r.sub ? <T style={{ fontSize: 11.5, color: colors.muted }}>{r.sub}</T> : null}
            <Num style={{ fontSize: 12.5, fontWeight: '700' }}>{r.value}</Num>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.tile, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round((r.value / max) * 100)}%`, height: '100%', backgroundColor: colors.amber }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** A faint sparkline for a trend shown beside a number. */
export function Spark({ values, width = 90, height = 26 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = 100 / (values.length - 1);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)} ${(30 - (v / max) * 28).toFixed(2)}`).join(' ');
  return (
    <Svg width={width} height={height} viewBox="0 0 100 30" preserveAspectRatio="none">
      <Line x1={0} y1={29.5} x2={100} y2={29.5} stroke={colors.line} strokeWidth={1} />
      <Path d={d} stroke={colors.navy} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
