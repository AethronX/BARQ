import { StyleSheet } from 'react-native';
import { colors, shadow } from './theme';

export const authStyles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: 20, gap: 24 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 20, gap: 14, ...shadow.card },
  input: { minHeight: 56, borderWidth: 1.5, borderColor: '#D7DEE8', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  textInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.ink, paddingVertical: 10 },
});
