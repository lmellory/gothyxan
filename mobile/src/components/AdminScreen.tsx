import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';
import { useSessionStore } from '../store/use-session-store';
import { AdminAnalytics } from '../types/api';
import { Palette } from '../theme/colors';

export function AdminScreen({ palette }: { palette: Palette }) {
  const session = useSessionStore();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const styles = useMemo(() => makeStyles(palette), [palette]);

  useEffect(() => {
    const run = async () => {
      if (!session.tokens?.accessToken || session.user?.role !== 'ADMIN') {
        return;
      }
      try {
        const data = await api.adminAnalytics(session.tokens.accessToken);
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Admin load failed');
      }
    };

    void run();
  }, [session.tokens?.accessToken, session.user?.role]);

  if (session.user?.role !== 'ADMIN') {
    return (
      <View style={styles.deniedBox}>
        <Text style={styles.deniedTitle}>Admin only</Text>
        <Text style={styles.deniedText}>Your account has no ADMIN role.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
      <Text style={styles.title}>Admin analytics</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!analytics ? <Text style={styles.placeholder}>Loading analytics...</Text> : null}

      {analytics ? (
        <View style={styles.grid}>
          <Metric palette={palette} label="Users" value={analytics.usersTotal} />
          <Metric palette={palette} label="Verified" value={analytics.verifiedUsers} />
          <Metric palette={palette} label="Generations" value={analytics.generationsTotal} />
          <Metric palette={palette} label="Brands" value={analytics.activeBrands} />
          <Metric palette={palette} label="Avg $" value={analytics.avgOutfitPrice} />
        </View>
      ) : null}

      {analytics?.topStyles?.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top styles</Text>
          {analytics.topStyles.map((entry) => (
            <View key={entry.style} style={styles.row}>
              <Text style={styles.rowText}>{entry.style}</Text>
              <Text style={styles.rowText}>{entry._count.style}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Metric({
  palette,
  label,
  value,
}: {
  palette: Palette;
  label: string;
  value: number;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: palette.line,
        borderRadius: 10,
        padding: 10,
        backgroundColor: palette.card,
      }}
    >
      <Text style={{ color: palette.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700' }}>{value}</Text>
    </View>
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
    error: {
      color: palette.danger,
      fontSize: 13,
    },
    placeholder: {
      color: palette.muted,
      fontSize: 13,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    card: {
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 12,
      backgroundColor: palette.card,
      padding: 10,
      gap: 6,
    },
    cardTitle: {
      color: palette.text,
      fontSize: 14,
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: palette.line,
      paddingTop: 6,
    },
    rowText: {
      color: palette.muted,
      fontSize: 13,
    },
    deniedBox: {
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 12,
      backgroundColor: palette.card,
      padding: 16,
      gap: 6,
    },
    deniedTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: '700',
    },
    deniedText: {
      color: palette.muted,
      fontSize: 13,
    },
  });
}
