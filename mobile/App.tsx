import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AdminScreen } from './src/components/AdminScreen';
import { AuthScreen } from './src/components/AuthScreen';
import { ChatScreen } from './src/components/ChatScreen';
import { SavedScreen } from './src/components/SavedScreen';
import { useSessionStore } from './src/store/use-session-store';
import { darkPalette, lightPalette } from './src/theme/colors';

type Tab = 'chat' | 'saved' | 'admin';

export default function App() {
  const osScheme = useColorScheme();
  const session = useSessionStore();
  const [manualTheme, setManualTheme] = useState<'system' | 'dark' | 'light'>('system');
  const [tab, setTab] = useState<Tab>('chat');

  useEffect(() => {
    if (!session.ready) {
      void session.hydrate();
    }
  }, [session.ready, session.hydrate]);

  const effectiveScheme = manualTheme === 'system' ? osScheme ?? 'dark' : manualTheme;
  const palette = effectiveScheme === 'dark' ? darkPalette : lightPalette;
  const styles = useMemo(() => makeStyles(palette), [palette]);

  if (!session.ready) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
        <Text style={styles.muted}>Loading session...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.root}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>GOTHYXAN</Text>
            <Text style={styles.headerTitle}>Mobile App</Text>
            <Text style={styles.muted}>iOS + Android chat interface</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.smallButton}
              onPress={() =>
                setManualTheme((prev) =>
                  prev === 'system' ? 'dark' : prev === 'dark' ? 'light' : 'system',
                )
              }
            >
              <Text style={styles.smallButtonText}>Theme: {manualTheme}</Text>
            </Pressable>
            {session.user ? (
              <Pressable style={styles.smallButton} onPress={() => void session.logout()}>
                <Text style={styles.smallButtonText}>Logout</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {!session.user || !session.tokens ? (
          <AuthScreen palette={palette} />
        ) : (
          <View style={{ flex: 1, gap: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              <TabButton
                label="Chat"
                active={tab === 'chat'}
                onPress={() => setTab('chat')}
                styles={styles}
              />
              <TabButton
                label="Saved"
                active={tab === 'saved'}
                onPress={() => setTab('saved')}
                styles={styles}
              />
              <TabButton
                label="Admin"
                active={tab === 'admin'}
                onPress={() => setTab('admin')}
                styles={styles}
              />
            </ScrollView>

            <View style={{ flex: 1 }}>
              {tab === 'chat' ? <ChatScreen palette={palette} /> : null}
              {tab === 'saved' ? <SavedScreen palette={palette} /> : null}
              {tab === 'admin' ? <AdminScreen palette={palette} /> : null}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(palette: typeof darkPalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.background,
    },
    root: {
      flex: 1,
      backgroundColor: palette.background,
      paddingHorizontal: 14,
      paddingBottom: 12,
      gap: 10,
    },
    header: {
      paddingTop: 8,
      gap: 8,
    },
    brand: {
      color: palette.accent,
      letterSpacing: 2.3,
      fontSize: 12,
      fontWeight: '700',
    },
    headerTitle: {
      color: palette.text,
      fontSize: 26,
      fontWeight: '800',
      marginTop: 2,
    },
    muted: {
      color: palette.muted,
      fontSize: 13,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    smallButton: {
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 999,
      backgroundColor: palette.card,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    smallButtonText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '600',
    },
    tabsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 4,
    },
    tabButton: {
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: 999,
      backgroundColor: palette.card,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    tabButtonActive: {
      borderColor: palette.accent,
      backgroundColor: palette.accent,
    },
    tabButtonText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '600',
    },
    tabButtonTextActive: {
      color: palette.accentText,
    },
  });
}
