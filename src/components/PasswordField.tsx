import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Pressable, TextInput } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { TextField, TextFieldProps } from './TextField';

export const PasswordField = forwardRef<TextInput, TextFieldProps>(function PasswordField(
  props,
  ref,
) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      ref={ref}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      slotRight={
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Nascondi password' : 'Mostra password'}
          onPress={() => setVisible((v) => !v)}
        >
          {visible ? (
            <EyeOff size={20} color={theme.textSoft} />
          ) : (
            <Eye size={20} color={theme.textSoft} />
          )}
        </Pressable>
      }
      {...props}
    />
  );
});
