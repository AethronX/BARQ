import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { Btn, Card, CompanyLogo, Ribbon, Stars, T, Num } from './components';
import { Icon, VerifiedBadge, type IconName } from './Icon';
import { colors } from './theme';

/**
 * Shared offer card (supplier quotes, carriers, forwarders). Mirrors the
 * mockup: company block beside two value tiles, navy accept button below.
 * Card width decides the layout: side-by-side when there is room, stacked on
 * narrow phones.
 */
export function OfferCard({
  name,
  verified,
  subtitle,
  rating,
  extra,
  tiles,
  meta,
  ribbon,
  acceptLabel,
  onAccept,
  acceptDisabled,
  acceptIcon = 'bolt',
  footer,
  onPressName,
}: {
  name: string;
  verified?: boolean;
  subtitle?: string;
  rating?: number | null;
  extra?: ReactNode;
  tiles: ReactNode;
  meta?: ReactNode;
  ribbon?: { label: string; icon: IconName };
  acceptLabel: string;
  onAccept?: () => void;
  acceptDisabled?: boolean;
  acceptIcon?: IconName;
  footer?: ReactNode;
  /** Opens the supplier's profile. Omitted where there is no profile to open. */
  onPressName?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card highlight={!!ribbon} style={{ padding: 14, paddingTop: ribbon ? 38 : 14, overflow: 'hidden', gap: 12 }}>
      {ribbon ? <Ribbon label={ribbon.label} icon={ribbon.icon} /> : null}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <CompanyLogo name={name} size={50} />
        <View style={{ flex: 1, gap: 2 }}>
          <Pressable
            onPress={onPressName}
            disabled={!onPressName}
            accessibilityRole={onPressName ? 'link' : undefined}
            accessibilityLabel={onPressName ? `${name} — ${t('sp_title')}` : undefined}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', minHeight: onPressName ? 32 : undefined }}
          >
            <T style={{ fontSize: 15, fontWeight: '700', flexShrink: 1, color: onPressName ? colors.navy : colors.ink }}>{name}</T>
            {verified ? <VerifiedBadge /> : null}
            {onPressName ? <Icon name="chevronEnd" size={15} color={colors.blue} /> : null}
          </Pressable>
          {subtitle ? <T style={{ fontSize: 12, color: colors.muted }}>{subtitle}</T> : null}
          {rating != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Stars rating={rating} />
              <Num style={{ fontWeight: '700', fontSize: 13 }}>{rating.toFixed(1)}</Num>
            </View>
          ) : null}
          {extra}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>{tiles}</View>
      {meta}
      <Btn label={acceptLabel} variant="navy" icon={acceptIcon} chevron={!acceptDisabled} onPress={onAccept ?? (() => {})} disabled={acceptDisabled} />
      {footer}
    </Card>
  );
}

export function Meta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Icon name={icon} size={17} />
      <T style={{ fontSize: 12, color: colors.ink2, flexShrink: 1 }}>{text}</T>
    </View>
  );
}

export function Features({ items }: { items: { icon: IconName; label: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
      {items.map((f) => (
        <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name={f.icon} size={16} />
          <T style={{ fontSize: 11.5, color: colors.ink2 }}>{f.label}</T>
        </View>
      ))}
    </View>
  );
}

export function ScoreLink({ score, onPress }: { score: number; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}>
      <T style={{ fontSize: 12, fontWeight: '600', color: colors.ink2 }}>{t('score_lbl')}</T>
      <View style={{ backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 }}>
        <Num style={{ color: colors.white, fontWeight: '700', fontSize: 12 }}>{score}</Num>
      </View>
      <T style={{ fontSize: 12, fontWeight: '600', color: colors.blue }}>{t('how')}</T>
    </Pressable>
  );
}
