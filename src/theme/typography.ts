import { TextStyle } from 'react-native';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption';

export const typography: Record<TextVariant, TextStyle> = {
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
};
