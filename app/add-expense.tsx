import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
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

import { DEFAULT_CATEGORIES } from '@/src/constants/categories';
import {
  addCustomCategory,
  deleteCustomCategory,
  getCustomCategories,
  getRecentCategories,
  recordRecentCategory,
} from '@/src/db/categories';
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

type CategoryListItem =
  | { type: 'section'; key: string; title: string }
  | { type: 'category'; key: string; value: string; isCustom: boolean }
  | { type: 'action'; key: string };

const MAX_AMOUNT_DIGITS = 10;

function sanitizeAmountInput(value: string) {
  return value.replace(/[^0-9]/g, '').slice(0, MAX_AMOUNT_DIGITS);
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const { currencyCode } = useCurrency();
  const { date, returnTo } = useLocalSearchParams<{
    date?: string | string[];
    returnTo?: string | string[];
    sourceTab?: string | string[];
  }>();

  const expenseDate = useMemo(() => parseDateParam(date), [date]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [itemName, setItemName] = useState('');
  const [note, setNote] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [amountError, setAmountError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingAttachment, setIsPickingAttachment] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [recentCategories, setRecentCategories] = useState<string[]>([]);
  const [isCustomCategoryModalVisible, setCustomCategoryModalVisible] = useState(false);
  const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
  const [customCategoryError, setCustomCategoryError] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
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
  const customCategoryLookup = useMemo(
    () => new Set(customCategories.map((value) => value.toLowerCase())),
    [customCategories]
  );

  const loadCategoryData = useCallback(async () => {
    try {
      const [custom, recent] = await Promise.all([getCustomCategories(), getRecentCategories()]);
      setCustomCategories(custom);
      setRecentCategories(recent);
    } catch {
      // Keep form usable even if categories metadata fails to load.
    }
  }, []);

  useEffect(() => {
    void loadCategoryData();
  }, [loadCategoryData]);

  const openCategorySheet = useCallback(() => {
    void loadCategoryData();
    bottomSheetModalRef.current?.present();
  }, [loadCategoryData]);

  const closeCategorySheet = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const filteredDefaultCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return [...DEFAULT_CATEGORIES];
    return DEFAULT_CATEGORIES.filter((value) => value.toLowerCase().includes(query));
  }, [categorySearch]);

  const filteredCustomCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return customCategories;
    return customCategories.filter((value) => value.toLowerCase().includes(query));
  }, [categorySearch, customCategories]);

  const filteredRecentCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    const allowedCategories = new Set<string>([
      ...DEFAULT_CATEGORIES.map((value) => value.toLowerCase()),
      ...customCategories.map((value) => value.toLowerCase()),
    ]);

    return recentCategories.filter((value) => {
      const normalized = value.toLowerCase();
      if (!allowedCategories.has(normalized)) return false;
      if (!query) return true;
      return normalized.includes(query);
    });
  }, [categorySearch, customCategories, recentCategories]);

  const categoryListItems = useMemo<CategoryListItem[]>(() => {
    const items: CategoryListItem[] = [];
    const recentLookup = new Set(filteredRecentCategories.map((value) => value.toLowerCase()));

    if (filteredRecentCategories.length > 0) {
      items.push({ type: 'section', key: 'section-recent', title: 'Recent' });
      filteredRecentCategories.forEach((value) =>
        items.push({
          type: 'category',
          key: `recent-${value.toLowerCase()}`,
          value,
          isCustom: customCategoryLookup.has(value.toLowerCase()),
        })
      );
    }

    const defaultWithoutRecent = filteredDefaultCategories.filter(
      (value) => !recentLookup.has(value.toLowerCase())
    );
    if (defaultWithoutRecent.length > 0) {
      items.push({ type: 'section', key: 'section-default', title: 'Default' });
      defaultWithoutRecent.forEach((value) =>
        items.push({
          type: 'category',
          key: `default-${value.toLowerCase()}`,
          value,
          isCustom: false,
        })
      );
    }

    const customWithoutRecent = filteredCustomCategories.filter(
      (value) => !recentLookup.has(value.toLowerCase())
    );
    if (customWithoutRecent.length > 0) {
      items.push({ type: 'section', key: 'section-custom', title: 'Custom' });
      customWithoutRecent.forEach((value) =>
        items.push({
          type: 'category',
          key: `custom-${value.toLowerCase()}`,
          value,
          isCustom: true,
        })
      );
    }

    items.push({ type: 'action', key: 'action-add-custom-category' });
    return items;
  }, [customCategoryLookup, filteredCustomCategories, filteredDefaultCategories, filteredRecentCategories]);

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
    const parsedAmount = Number(amount);

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
      await recordRecentCategory(category);

      Keyboard.dismiss();
      const returnDestination = Array.isArray(returnTo) ? returnTo[0] : returnTo;
      if (returnDestination === 'home') {
        router.replace('/(tabs)');
      } else {
        router.back();
      }
    } catch {
      setSaveError('Failed to save expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectCategory = (value: string) => {
    setCategory(value);
    setCategorySearch('');
    closeCategorySheet();
  };

  const handleDeleteCustomCategory = useCallback(
    (categoryName: string) => {
      Alert.alert('Delete custom category?', `Remove "${categoryName}" from custom categories?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteCustomCategory(categoryName);
                await loadCategoryData();
                if (category === categoryName) {
                  setCategory(DEFAULT_CATEGORIES[0]);
                }
              } catch {
                Alert.alert('Failed to delete', 'Could not delete this custom category.');
              }
            })();
          },
        },
      ]);
    },
    [category, loadCategoryData]
  );

  const handleOpenCustomCategoryModal = useCallback(() => {
    setNewCustomCategoryName('');
    setCustomCategoryError('');
    setCustomCategoryModalVisible(true);
  }, []);

  const handleAddCustomCategory = useCallback(async () => {
    if (isAddingCustomCategory) return;

    try {
      setCustomCategoryError('');
      setIsAddingCustomCategory(true);
      const createdCategory = await addCustomCategory(newCustomCategoryName);
      await loadCategoryData();
      setCategory(createdCategory);
      setCategorySearch('');
      setCustomCategoryModalVisible(false);
      closeCategorySheet();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add custom category';
      setCustomCategoryError(message);
    } finally {
      setIsAddingCustomCategory(false);
    }
  }, [closeCategorySheet, isAddingCustomCategory, loadCategoryData, newCustomCategoryName]);

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
              <View style={styles.amountInputRow}>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(sanitizeAmountInput(value));
                    if (amountError) setAmountError('');
                  }}
                  keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                  inputMode="numeric"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  maxLength={MAX_AMOUNT_DIGITS}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
                <AppText variant="title" style={styles.amountSuffix}>
                  {currencySymbol}
                </AppText>
              </View>
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
                numberOfLines={2}
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
        <BottomSheetFlatList<CategoryListItem>
          data={categoryListItems}
          keyExtractor={(item: CategoryListItem) => item.key}
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
          renderItem={({ item }: { item: CategoryListItem }) => {
            if (item.type === 'section') {
              return (
                <AppText variant="caption" color={colors.textSecondary} style={styles.sectionTitle}>
                  {item.title}
                </AppText>
              );
            }

            if (item.type === 'action') {
              return (
                <Pressable style={styles.addCustomCategoryButton} onPress={handleOpenCustomCategoryModal}>
                  <MaterialIcons name="add-circle-outline" size={18} color={colors.fab} />
                  <AppText variant="body" color={colors.fab} style={styles.addCustomCategoryText}>
                    Add custom category
                  </AppText>
                </Pressable>
              );
            }

            const selected = item.value === category;
            return (
              <View style={[styles.categoryOption, selected && styles.categoryOptionSelected]}>
                <Pressable
                  style={styles.categoryOptionMain}
                  onPress={() => handleSelectCategory(item.value)}>
                  <AppText
                    variant="body"
                    color={selected ? colors.white : colors.textPrimary}
                    style={selected ? styles.categoryOptionTextSelected : undefined}>
                    {item.value}
                  </AppText>
                </Pressable>

                {item.isCustom ? (
                  <Pressable
                    style={[styles.deleteCustomButton, selected && styles.deleteCustomButtonSelected]}
                    onPress={() => handleDeleteCustomCategory(item.value)}
                    hitSlop={8}>
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color={selected ? colors.white : colors.textSecondary}
                    />
                  </Pressable>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <AppText variant="body" color={colors.textSecondary} style={styles.emptySearchText}>
              No categories found
            </AppText>
          }
        />
      </BottomSheetModal>

      <Modal
        visible={isCustomCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomCategoryModalVisible(false)}>
        <Pressable style={styles.customCategoryModalBackdrop} onPress={() => setCustomCategoryModalVisible(false)}>
          <Pressable style={styles.customCategoryModalCard} onPress={() => {}}>
            <AppText variant="subtitle">Add custom category</AppText>
            <TextInput
              style={styles.customCategoryInput}
              value={newCustomCategoryName}
              onChangeText={(value) => {
                setNewCustomCategoryName(value);
                if (customCategoryError) setCustomCategoryError('');
              }}
              placeholder="Category name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              maxLength={32}
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleAddCustomCategory();
              }}
            />
            {!!customCategoryError && (
              <AppText variant="caption" color={colors.danger} style={styles.customCategoryErrorText}>
                {customCategoryError}
              </AppText>
            )}
            <View style={styles.customCategoryModalActions}>
              <Pressable
                style={styles.customCategoryCancelButton}
                onPress={() => setCustomCategoryModalVisible(false)}
                disabled={isAddingCustomCategory}>
                <AppText variant="body" color={colors.textPrimary}>
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                style={styles.customCategorySaveButton}
                onPress={() => {
                  void handleAddCustomCategory();
                }}
                disabled={isAddingCustomCategory}>
                <AppText variant="body" color={colors.white} style={styles.customCategorySaveButtonText}>
                  {isAddingCustomCategory ? 'Saving...' : 'Save'}
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  amountInputRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  amountSuffix: {
    color: colors.textSecondary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
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
    minHeight: 48,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    lineHeight: 20,
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
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  categoryOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryOptionMain: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  categoryOptionSelected: {
    backgroundColor: colors.fab,
    borderColor: colors.fab,
  },
  categoryOptionTextSelected: {
    fontWeight: '700',
  },
  deleteCustomButton: {
    width: 40,
    height: 40,
    marginRight: spacing.xs,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCustomButtonSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  addCustomCategoryButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
  },
  addCustomCategoryText: {
    fontWeight: '700',
  },
  emptySearchText: {
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  customCategoryModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  customCategoryModalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  customCategoryInput: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },
  customCategoryErrorText: {
    marginTop: spacing.sm,
  },
  customCategoryModalActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  customCategoryCancelButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
  },
  customCategorySaveButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.fab,
  },
  customCategorySaveButtonText: {
    fontWeight: '700',
  },
});
