import { categoryColors } from '@/src/theme';

export const EXPENSE_CATEGORIES = ['Продукты', 'Транспорт', 'Кафе', 'Дом', 'Другое'] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  ...categoryColors,
};
