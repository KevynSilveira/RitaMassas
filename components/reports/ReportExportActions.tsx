import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { StyleSheet, View } from 'react-native';

type Props = {
  onExportCsv: () => void;
  onExportPdf: () => void;
};

export function ReportExportActions({ onExportCsv, onExportPdf }: Props) {
  const { isDesktop } = useResponsive();

  return (
    <View style={[styles.wrap, isDesktop && styles.wrapDesktop]}>
      <PrimaryButton
        title="Baixar CSV"
        onPress={onExportCsv}
        variant="outline"
        style={[styles.button, isDesktop && styles.buttonDesktop]}
      />
      <PrimaryButton
        title="Baixar PDF"
        onPress={onExportPdf}
        style={[styles.button, isDesktop && styles.buttonDesktop]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.space.sm,
  },
  wrapDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: '100%',
  },
  buttonDesktop: {
    flex: 1,
  },
});
