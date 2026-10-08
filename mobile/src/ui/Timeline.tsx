import { View } from 'react-native';
import { T } from './components';
import { Icon } from './Icon';
import { colors } from './theme';

/** Vertical status timeline: done steps green, current amber, future grey. */
export function Timeline({ steps, current }: { steps: { key: string; label: string; time?: string }[]; current: number }) {
  return (
    <View>
      {steps.map((st, i) => {
        const done = i <= current;
        const cur = i === current;
        const last = i === steps.length - 1;
        return (
          <View key={st.key} style={{ flexDirection: 'row', gap: 10, paddingBottom: last ? 0 : 16 }} accessible accessibilityLabel={`${st.label}${done ? ' ✓' : ''}`}>
            <View style={{ alignItems: 'center', width: 22 }}>
              <View
                style={{
                  width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: cur ? colors.amber : done ? colors.greenIcon : '#E8ECF2',
                  borderWidth: cur ? 4 : 0, borderColor: 'rgba(248,169,27,0.25)',
                }}
              >
                {done ? <Icon name="check" size={12} color={colors.white} /> : null}
              </View>
              {!last ? <View style={{ position: 'absolute', top: 22, bottom: -16, width: 2, backgroundColor: i < current ? '#86EFAC' : colors.line }} /> : null}
            </View>
            <T style={{ flex: 1, fontSize: 13.5, fontWeight: done ? '600' : '500', color: done ? colors.ink : colors.muted }}>{st.label}</T>
            {st.time ? <T style={{ fontSize: 11.5, color: colors.muted }}>{st.time}</T> : null}
          </View>
        );
      })}
    </View>
  );
}
