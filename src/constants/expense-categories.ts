export const EXPENSE_CATEGORIES = ['Продукты', 'Транспорт', 'Кафе', 'Дом', 'Другое'] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Продукты: '#3B82F6',
  Транспорт: '#F97316',
  Кафе: '#EC4899',
  Дом: '#10B981',
  Другое: '#8B5CF6',
};
