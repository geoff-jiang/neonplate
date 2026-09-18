// components/ui/ConfirmDialog.tsx
import { View, Modal } from 'react-native';
import { Text } from './text';
import { Button } from './button';
import { Card } from './card';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View className="flex-1 items-center justify-center bg-black/50">
        <Card className="w-80">
          <Text variant="h3" className="mb-2">
            {title}
          </Text>
          <Text className="mb-6">{message}</Text>
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={onCancel} disabled={busy}>
              {cancelText}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              className="flex-1"
              onPress={onConfirm}
              disabled={busy}
            >
              {busy ? 'Working...' : confirmText}
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
}
