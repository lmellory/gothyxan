import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useChatStore } from '../store/use-chat-store';
import { Palette } from '../theme/colors';

export function SavedScreen({ palette }: { palette: Palette }) {
  const chat = useChatStore();

  useEffect(() => {
    void chat.fetchSaved();
  }, []);

  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
      <Text style={styles.title}>Saved outfits</Text>
      <Text style={styles.subtitle}>Synced from backend `/outfits/saved`.</Text>

      {chat.saved.length === 0 ? (
        <Text style={styles.placeholder}>No saved outfits yet.</Text>
      ) : (
        chat.saved.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {entry.outfitJson.style} | ${entry.outfitJson.total_price}
            </Text>
            <Text style={styles.meta}>
              {entry.channel} | {new Date(entry.createdAt).toLocaleString()}
            </Text>
            <Text style={styles.json}>{JSON.stringify(entry.outfitJson, null, 2)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    title: {
      color: palette.text,
      fontSize: 20,
      fontWeight: '700',
    },
    subtitle: {
      color: palette.muted,
      fontSize: 12,
      marginBottom: 8,
    },
    placeholder: {
      color: palette.muted,
      fontSize: 13,
    },
    card: {
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 12,
      backgroundColor: palette.card,
      padding: 10,
      gap: 4,
    },
    cardTitle: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '700',
    },
    meta: {
      color: palette.muted,
      fontSize: 11,
    },
    json: {
      marginTop: 4,
      borderRadius: 8,
      backgroundColor: palette.cardSoft,
      color: palette.muted,
      fontSize: 10,
      lineHeight: 14,
      padding: 8,
      fontFamily: 'monospace',
    },
  });
}
