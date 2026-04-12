import { theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';

export type ActionFeedbackButton = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
};

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  primaryAction?: ActionFeedbackButton;
  secondaryAction?: ActionFeedbackButton;
};

function runAction(
  action: ActionFeedbackButton | undefined,
  onClose: () => void
) {
  onClose();
  action?.onPress?.();
}

export function ActionFeedbackModal({
  visible,
  title,
  message,
  onClose,
  primaryAction,
  secondaryAction,
}: Props) {
  const { isDesktop } = useResponsive();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} />

        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={[styles.actions, isDesktop && styles.actionsDesktop]}>
            {primaryAction ? (
              <PrimaryButton
                title={primaryAction.label}
                onPress={() => runAction(primaryAction, onClose)}
                variant={primaryAction.variant ?? 'primary'}
                style={[styles.button, isDesktop && styles.buttonDesktop]}
              />
            ) : null}

            <PrimaryButton
              title={secondaryAction?.label ?? 'OK'}
              onPress={() => runAction(secondaryAction, onClose)}
              variant={secondaryAction?.variant ?? 'outline'}
              style={[styles.button, isDesktop && styles.buttonDesktop]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.space.lg,
    backgroundColor: theme.colors.overlay,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.space.lg,
  },
  cardDesktop: {
    maxWidth: 460,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  message: {
    marginTop: theme.space.sm,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  actions: {
    marginTop: theme.space.lg,
    gap: theme.space.sm,
  },
  actionsDesktop: {
    flexDirection: 'row',
  },
  button: {
    width: '100%',
  },
  buttonDesktop: {
    flex: 1,
  },
});
