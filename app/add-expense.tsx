import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/src/constants/expense-categories';
import { addTransaction } from '@/src/db/transactions';
import { toISODateOnly } from '@/src/utils/dateRanges';

export default function AddExpenseScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Продукты');
  const [itemName, setItemName] = useState('');
  const [note, setNote] = useState('');
  const [amountError, setAmountError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [today] = useState(() => new Date());

  const displayDate = useMemo(() => today.toLocaleDateString('ru-RU'), [today]);

  const handleSave = async () => {
    const parsedAmount = Number(amount.replace(',', '.'));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAmountError('Сумма должна быть больше 0');
      return;
    }

    try {
      setAmountError('');
      setSaveError('');
      setIsSaving(true);

      await addTransaction({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount: parsedAmount,
        category,
        date: toISODateOnly(today),
        ...(itemName.trim() ? { itemName: itemName.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });

      router.back();
    } catch {
      setSaveError('Не удалось сохранить расход');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Добавить расход' }} />

      <Text style={styles.label}>Amount *</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={(value) => {
          setAmount(value);
          if (amountError) {
            setAmountError('');
          }
        }}
        keyboardType="numeric"
        placeholder="0"
      />
      {!!amountError && <Text style={styles.errorText}>{amountError}</Text>}

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipsRow}>
        {EXPENSE_CATEGORIES.map((option) => {
          const selected = option === category;

          return (
            <Pressable
              key={option}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setCategory(option)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Item (optional)</Text>
      <TextInput
        style={styles.input}
        value={itemName}
        onChangeText={setItemName}
        placeholder="Например, Молоко"
      />

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={[styles.input, styles.noteInput]}
        value={note}
        onChangeText={setNote}
        placeholder="Комментарий"
        multiline
      />

      <Text style={styles.dateText}>Date: {displayDate}</Text>
      {!!saveError && <Text style={styles.errorText}>{saveError}</Text>}

      <View style={styles.actions}>
        <Pressable
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}>
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
        <Pressable
          style={[styles.cancelButton, isSaving && styles.buttonDisabled]}
          onPress={() => router.back()}
          disabled={isSaving}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    gap: 8,
  },
  label: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  noteInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#b00020',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: '#fff',
  },
  chipSelected: {
    borderColor: '#111',
    backgroundColor: '#111',
  },
  chipText: {
    color: '#222',
  },
  chipTextSelected: {
    color: '#fff',
  },
  dateText: {
    marginTop: 10,
    fontSize: 15,
    color: '#444',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#222',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
