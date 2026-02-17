import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Easing } from 'react-native-reanimated';

import { CATEGORIES, ExpenseCategory } from '@/src/constants/categories';
import { addTransaction } from '@/src/db/transactions';
import { useCurrency } from '@/src/providers/CurrencyProvider';
import { colors, radius, spacing } from '@/src/theme';
import { toISODateOnly } from '@/src/utils/dateRanges';
import { getCurrencySymbol } from '@/src/utils/money';
import { AppText } from '@/src/ui/AppText';
import { Card } from '@/src/ui/Card';
import { Screen } from '@/src/ui/Screen';

function parseDateParam(dateParam: string | string[] | undefined) {
  const raw = Array.isArray(dateParam) ? dateParam[0] : dateParam;

  if (!raw) return new Date();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00`);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const { currencyCode } = useCurrency();
  const { date } = useLocalSearchParams<{ date?: string | string[] }>();

  const expenseDate = useMemo(() => parseDateParam(date), [date]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Groceries');
  const [itemName, setItemName] = useState('');
  const [note, setNote] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [amountError, setAmountError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingAttachment, setIsPickingAttachment] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const snapPoints = useMemo(() => ['60%'], []);
  const bottomSheetAnimationConfigs = useBottomSheetTimingConfigs({
    duration: 240,
    easing: Easing.out(Easing.cubic),
  });

  const displayDate = useMemo(() => expenseDate.toLocaleDateString('en-GB'), [expenseDate]);
  const currencySymbol = useMemo(() => getCurrencySymbol(currencyCode), [currencyCode]);

  const filteredCategories = useMemo<ExpenseCategory[]>(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return [...CATEGORIES] as ExpenseCategory[];
    return CATEGORIES.filter((item) => item.toLowerCase().includes(query)) as ExpenseCategory[];
  }, [categorySearch]);

  const openCategorySheet = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const closeCategorySheet = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
        pressBehavior="close"
      />
    ),
    []
  );

  const pickImageFromLibrary = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        'Photos permission needed',
        'Allow photo library access to attach a receipt.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAttachmentUri(result.assets[0].uri);
    }
  }, []);

  const pickImageFromCamera = useCallback(async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access to capture a receipt.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAttachmentUri(result.assets[0].uri);
    }
  }, []);

  const runAttachmentPicker = useCallback(
    async (source: 'library' | 'camera') => {
      if (isSaving || isPickingAttachment) return;

      try {
        setIsPickingAttachment(true);
        if (source === 'camera') {
          await pickImageFromCamera();
          return;
        }

        await pickImageFromLibrary();
      } finally {
        setIsPickingAttachment(false);
      }
    },
    [isPickingAttachment, isSaving, pickImageFromCamera, pickImageFromLibrary]
  );

  const openAttachmentPicker = useCallback(() => {
    if (isSaving || isPickingAttachment) return;

    Alert.alert('Attach photo', 'Choose image source', [
      { text: 'Camera', onPress: () => void runAttachmentPicker('camera') },
      { text: 'Photo Library', onPress: () => void runAttachmentPicker('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [isPickingAttachment, isSaving, runAttachmentPicker]);

  const handleSave = async () => {
    const parsedAmount = Number(amount.replace(',', '.'));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAmountError('Amount must be greater than 0');
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
        date: toISODateOnly(expenseDate),
        ...(itemName.trim() ? { itemName: itemName.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(attachmentUri ? { attachmentUri } : {}),
      });

      Keyboard.dismiss();
      router.back();
    } catch {
      setSaveError('Failed to save expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectCategory = (value: ExpenseCategory) => {
    setCategory(value);
    setCategorySearch('');
    closeCategorySheet();
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <Stack.Screen options={{ title: 'Add expense', headerBackButtonDisplayMode: 'minimal' }} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={92}>
          <ScrollView
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}>
            <Card style={styles.amountCard}>
              <AppText variant="caption" color={colors.textSecondary}>
                Amount ({currencyCode})
              </AppText>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(value) => {
                  setAmount(value);
                  if (amountError) setAmountError('');
                }}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                placeholder={`${currencySymbol}0.00`}
                placeholderTextColor={colors.textSecondary}
              />
              {!!amountError && (
                <AppText variant="caption" color={colors.danger} style={styles.errorText}>
                  {amountError}
                </AppText>
              )}
            </Card>

            <Card style={styles.fieldCard}>
              <View style={styles.categoryRow}>
                <View style={styles.categoryTextBlock}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    Category
                  </AppText>
                  <AppText variant="body" style={styles.categoryValue}>
                    {category}
                  </AppText>
                </View>

                <Pressable style={styles.chooseButton} onPress={openCategorySheet} disabled={isSaving}>
                  <AppText variant="caption" color={colors.white} style={styles.chooseButtonText}>
                    Select
                  </AppText>
                </Pressable>
              </View>
            </Card>

            <Card style={styles.fieldCard}>
              <AppText variant="caption" color={colors.textSecondary}>
                Item
              </AppText>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={setItemName}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                placeholder="For example, Milk"
                placeholderTextColor={colors.textSecondary}
              />
            </Card>

            <Card style={styles.fieldCard}>
              <AppText variant="caption" color={colors.textSecondary}>
                Note
              </AppText>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note"
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                onFocus={() => {
                  requestAnimationFrame(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  });
                }}
              />
            </Card>

            <Card style={styles.fieldCard}>
              <AppText variant="caption" color={colors.textSecondary}>
                Receipt
              </AppText>
              <View style={styles.attachmentActions}>
                <Pressable
                  style={styles.attachButton}
                  onPress={openAttachmentPicker}
                  disabled={isSaving || isPickingAttachment}>
                  <AppText variant="caption" color={colors.white} style={styles.attachButtonText}>
                    {isPickingAttachment
                      ? 'Opening...'
                      : attachmentUri
                        ? 'Change photo'
                        : 'Add receipt'}
                  </AppText>
                </Pressable>
                {attachmentUri ? (
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => setAttachmentUri(null)}
                    disabled={isSaving || isPickingAttachment}>
                    <AppText variant="caption" color={colors.textPrimary} style={styles.removeButtonText}>
                      Remove
                    </AppText>
                  </Pressable>
                ) : null}
              </View>

              {attachmentUri ? (
                <Pressable
                  style={styles.attachmentPreviewWrap}
                  onPress={openAttachmentPicker}
                  disabled={isSaving || isPickingAttachment}>
                  <Image source={{ uri: attachmentUri }} style={styles.attachmentPreview} contentFit="cover" />
                </Pressable>
              ) : null}
            </Card>

            <AppText variant="caption" color={colors.textSecondary} style={styles.dateText}>
              Date: {displayDate}
            </AppText>

            {!!saveError && (
              <AppText variant="caption" color={colors.danger} style={styles.errorText}>
                {saveError}
              </AppText>
            )}

            <View style={styles.actions}>
              <Pressable
                style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaving}>
                <AppText variant="body" color={colors.white} style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </AppText>
              </Pressable>
              <Pressable
                style={[styles.cancelButton, isSaving && styles.buttonDisabled]}
                onPress={() => {
                  Keyboard.dismiss();
                  router.back();
                }}
                disabled={isSaving}>
                <AppText variant="body" color={colors.textPrimary}>
                  Cancel
                </AppText>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        animateOnMount
        enablePanDownToClose
        animationConfigs={bottomSheetAnimationConfigs}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
        onDismiss={() => setCategorySearch('')}>
        <BottomSheetFlatList
          data={filteredCategories}
          keyExtractor={(item: ExpenseCategory) => item}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.categoryListContent}
          ListHeaderComponent={
            <View style={styles.sheetHeader}>
              <AppText variant="subtitle" style={styles.sheetTitle}>
                Select category
              </AppText>
              <BottomSheetTextInput
                style={styles.searchInput}
                value={categorySearch}
                onChangeText={setCategorySearch}
                placeholder="Search category"
                placeholderTextColor={colors.textSecondary}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          }
          renderItem={({ item }: { item: ExpenseCategory }) => {
            const selected = item === category;
            return (
              <Pressable
                style={[styles.categoryOption, selected && styles.categoryOptionSelected]}
                onPress={() => handleSelectCategory(item)}>
                <AppText
                  variant="body"
                  color={selected ? colors.white : colors.textPrimary}
                  style={selected ? styles.categoryOptionTextSelected : undefined}>
                  {item}
                </AppText>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <AppText variant="body" color={colors.textSecondary} style={styles.emptySearchText}>
              No categories found
            </AppText>
          }
        />
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  amountCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  amountInput: {
    marginTop: spacing.sm,
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  fieldCard: {
    padding: spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTextBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  categoryValue: {
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  chooseButton: {
    backgroundColor: colors.fab,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chooseButtonText: {
    fontWeight: '700',
  },
  input: {
    marginTop: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noteInput: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  attachmentActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  attachButton: {
    backgroundColor: colors.fab,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attachButtonText: {
    fontWeight: '700',
  },
  removeButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  removeButtonText: {
    fontWeight: '700',
  },
  attachmentPreviewWrap: {
    marginTop: spacing.md,
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
  },
  dateText: {
    marginTop: 0,
  },
  actions: {
    marginTop: 0,
    gap: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.fab,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    marginTop: spacing.xs,
  },
  sheetBackground: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetHandle: {
    backgroundColor: colors.border,
    width: 44,
    height: 5,
    borderRadius: radius.round,
  },
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetTitle: {
    marginBottom: spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 16,
  },
  categoryListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  categoryOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  categoryOptionSelected: {
    backgroundColor: colors.fab,
    borderColor: colors.fab,
  },
  categoryOptionTextSelected: {
    fontWeight: '700',
  },
  emptySearchText: {
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
