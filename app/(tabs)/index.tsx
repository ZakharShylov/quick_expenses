import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getAllTransactions, Transaction } from '@/src/db/transactions';

export default function HomeScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadError, setLoadError] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      setLoadError('');
      const allTransactions = await getAllTransactions();
      setTransactions(allTransactions.slice(0, 10));
    } catch {
      setLoadError('Не удалось загрузить расходы');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTransactions();
    }, [loadTransactions])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Expense</Text>
      {!!loadError && <Text style={styles.errorText}>{loadError}</Text>}

      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>Пока нет расходов</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.rowLeftText}>
                {item.itemName ? `${item.category} - ${item.itemName}` : item.category}
              </Text>
              <Text style={styles.rowAmount}>{item.amount.toFixed(2)}</Text>
            </View>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/add-expense')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 8,
    color: '#b00020',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  list: {
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 100,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
  },
  rowLeftText: {
    flex: 1,
    paddingRight: 12,
    fontSize: 15,
    color: '#222',
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '500',
  },
});
