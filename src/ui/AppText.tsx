import { ReactNode } from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { colors, TextVariant, typography } from '@/src/theme';

type AppTextProps = TextProps & {
  children: ReactNode;
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function AppText({ children, variant = 'body', color, style, ...rest }: AppTextProps) {
  return (
    <Text style={[typography[variant], { color: color ?? colors.textPrimary }, style]} {...rest}>
      {children}
    </Text>
  );
}
