import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Palette } from '../theme/colors';
import { useChatStore } from '../store/use-chat-store';

const stylePresets = [
  'streetwear',
  'minimal',
  'old money',
  'luxury',
  'techwear',
  'business',
  'vintage',
  'y2k',
  'smart casual',
  'goth',
  'avant-garde',
];

export function ChatScreen({ palette }: { palette: Palette }) {
  const chat = useChatStore();
  const [style, setStyle] = useState('streetwear');
  const [occasion, setOccasion] = useState('casual');
  const [city, setCity] = useState('New York');
  const [budgetMode, setBudgetMode] = useState<'cheaper' | 'premium' | 'custom'>('cheaper');
  const [budgetMin, setBudgetMin] = useState('200');
  const [budgetMax, setBudgetMax] = useState('900');

  const styles = useMemo(() => makeStyles(palette), [palette]);

  async function handleGenerate() {
    await chat.generate({
      style,
      occasion,
      city,
      budgetMode,
      budgetMin: budgetMode === 'custom' ? Number(budgetMin) : undefined,
      budgetMax: budgetMode === 'custom' ? Number(budgetMax) : undefined,
      fitPreference: 'oversize',
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.promptBox}>
        <Text style={styles.title}>Outfit prompt</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {stylePresets.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, style === item && styles.chipActive]}
              onPress={() => setStyle(item)}
            >
              <Text style={[styles.chipText, style === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Occasion"
            placeholderTextColor={palette.muted}
            value={occasion}
            onChangeText={setOccasion}
          />
          <TextInput
            style={styles.input}
            placeholder="City"
            placeholderTextColor={palette.muted}
            value={city}
            onChangeText={setCity}
          />
        </View>

        <View style={styles.chipsRow}>
          {(['cheaper', 'premium', 'custom'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.chip, budgetMode === mode && styles.chipActive]}
              onPress={() => setBudgetMode(mode)}
            >
              <Text style={[styles.chipText, budgetMode === mode && styles.chipTextActive]}>{mode}</Text>
            </Pressable>
          ))}
        </View>

        {budgetMode === 'custom' ? (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Budget min"
              placeholderTextColor={palette.muted}
              keyboardType="numeric"
              value={budgetMin}
              onChangeText={setBudgetMin}
            />
            <TextInput
              style={styles.input}
              placeholder="Budget max"
              placeholderTextColor={palette.muted}
              keyboardType="numeric"
              value={budgetMax}
              onChangeText={setBudgetMax}
            />
          </View>
        ) : null}

        <Pressable style={styles.primaryButton} onPress={() => void handleGenerate()} disabled={chat.loading}>
          <Text style={styles.primaryButtonText}>
            {chat.loading ? 'Generating...' : 'Generate branded outfit'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.chat} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
        {chat.error ? <Text style={styles.errorText}>{chat.error}</Text> : null}

        {chat.messages.length === 0 ? (
          <Text style={styles.placeholderText}>
            Submit style + budget. Mobile will display strict JSON outfit output.
          </Text>
        ) : null}

        {chat.messages.map((message) => (
          <View
            key={message.id}
            style={[styles.message, message.role === 'user' ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={styles.messageRole}>{message.role === 'user' ? 'You' : 'GOTHYXAN AI'}</Text>
            <Text style={styles.messageText}>{message.text}</Text>

            {'outfit' in message ? (
              <View style={styles.outfitBlock}>
                <Text style={styles.outfitTitle}>
                  Total ${message.outfit.total_price} | {message.outfit.budget_range}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
                  {[
                    { label: 'Top', piece: message.outfit.top },
                    { label: 'Bottom', piece: message.outfit.bottom },
                    { label: 'Shoes', piece: message.outfit.shoes },
                    { label: 'Outerwear', piece: message.outfit.outerwear },
                    ...message.outfit.accessories.slice(0, 2).map((piece, index) => ({
                      label: `Accessory ${index + 1}`,
                      piece,
                    })),
                  ].map(({ label, piece }) => (
                    <View key={`${message.id}-${label}-${piece.item}`} style={styles.previewCard}>
                      <Image source={{ uri: piece.image_url }} style={styles.previewImage} />
                      <Text style={styles.previewLabel}>{label}</Text>
                      <Text numberOfLines={1} style={styles.previewName}>
                        {piece.brand}
                      </Text>
                      <Text numberOfLines={1} style={styles.previewPrice}>
                        ${piece.price}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                <Text style={styles.outfitJson}>{JSON.stringify(message.outfit, null, 2)}</Text>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => void chat.saveOutfit(message.outfit)}
                >
                  <Text style={styles.secondaryButtonText}>Save outfit</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: 12,
    },
    promptBox: {
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 16,
      backgroundColor: palette.card,
      padding: 12,
      gap: 10,
    },
    title: {
      color: palette.text,
      fontSize: 16,
      fontWeight: '700',
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },
    chip: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: palette.line,
      backgroundColor: palette.cardSoft,
    },
    chipActive: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    chipText: {
      color: palette.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    chipTextActive: {
      color: palette.accentText,
      fontWeight: '700',
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 10,
      backgroundColor: palette.cardSoft,
      paddingHorizontal: 10,
      paddingVertical: 9,
      color: palette.text,
      fontSize: 14,
    },
    primaryButton: {
      borderRadius: 10,
      backgroundColor: palette.accent,
      alignItems: 'center',
      paddingVertical: 11,
    },
    primaryButtonText: {
      color: palette.accentText,
      fontWeight: '700',
      fontSize: 13,
    },
    chat: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 16,
      padding: 10,
      backgroundColor: palette.card,
    },
    placeholderText: {
      color: palette.muted,
      fontSize: 13,
      padding: 8,
    },
    message: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      gap: 4,
    },
    userBubble: {
      borderColor: palette.line,
      backgroundColor: palette.cardSoft,
      alignSelf: 'flex-end',
      maxWidth: '96%',
    },
    aiBubble: {
      borderColor: palette.line,
      backgroundColor: palette.background,
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    messageRole: {
      color: palette.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
    },
    messageText: {
      color: palette.text,
      fontSize: 13,
      lineHeight: 19,
    },
    outfitBlock: {
      marginTop: 4,
      gap: 6,
    },
    previewRow: {
      gap: 8,
      paddingVertical: 2,
    },
    previewCard: {
      width: 120,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: palette.cardSoft,
    },
    previewImage: {
      width: '100%',
      height: 96,
      backgroundColor: palette.card,
    },
    previewLabel: {
      color: palette.muted,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 6,
      paddingTop: 6,
    },
    previewName: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 6,
      paddingTop: 2,
    },
    previewPrice: {
      color: palette.muted,
      fontSize: 11,
      paddingHorizontal: 6,
      paddingBottom: 8,
    },
    outfitTitle: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '700',
    },
    outfitJson: {
      color: palette.muted,
      fontSize: 10,
      fontFamily: 'monospace',
      backgroundColor: palette.cardSoft,
      borderRadius: 8,
      padding: 8,
      lineHeight: 14,
    },
    secondaryButton: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: palette.cardSoft,
    },
    secondaryButtonText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '600',
    },
    errorText: {
      color: palette.danger,
      fontSize: 13,
      marginBottom: 6,
    },
  });
}
