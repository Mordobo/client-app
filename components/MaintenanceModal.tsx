import { MaintenanceScreen } from '@/components/MaintenanceScreen';
import React from 'react';
import { Modal, Platform } from 'react-native';

interface MaintenanceModalProps {
  visible: boolean;
  onRetry: () => void;
  isChecking?: boolean;
}

/**
 * Full-screen modal so maintenance blocks all navigation while still mounting the app tree.
 */
export function MaintenanceModal({ visible, onRetry, isChecking = false }: MaintenanceModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={() => {
        /* Intentionally empty: maintenance must not be dismissed with Android back. */
      }}
    >
      <MaintenanceScreen onRetry={onRetry} isChecking={isChecking} />
    </Modal>
  );
}
