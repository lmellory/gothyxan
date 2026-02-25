import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Palette } from '../theme/colors';
import { useSessionStore } from '../store/use-session-store';

type Mode = 'login' | 'register' | 'verify' | 'reset-request' | 'reset-confirm';

export function AuthScreen({ palette }: { palette: Palette }) {
  const session = useSessionStore();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  async function handleLogin() {
    setNotice(null);
    try {
      await session.login(email, password);
    } catch {
      // handled by store
    }
  }

  async function handleRegister() {
    setNotice(null);
    try {
      const message = await session.register({ email, password, name: name || undefined });
      setNotice(message);
      setMode('verify');
    } catch {
      // handled by store
    }
  }

  async function handleVerify() {
    setNotice(null);
    try {
      await session.verifyEmail(email, code);
    } catch {
      // handled by store
    }
  }

  async function handleRequestReset() {
    setNotice(null);
    try {
      const message = await session.requestReset(email);
      setNotice(message);
      setMode('reset-confirm');
    } catch {
      // handled by store
    }
  }

  async function handleResetConfirm() {
    setNotice(null);
    try {
      const message = await session.resetPassword(email, code, newPassword);
      setNotice(message);
      setMode('login');
    } catch {
      // handled by store
    }
  }

  const styles = makeStyles(palette);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.panel}>
        <Text style={styles.badge}>GOTHYXAN MOBILE</Text>
        <Text style={styles.title}>{label(mode)}</Text>
        <Text style={styles.subtitle}>Email verification + JWT session.</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor={palette.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={styles.input}
        />

        {mode === 'register' ? (
          <TextInput
            placeholder="Name (optional)"
            placeholderTextColor={palette.muted}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        ) : null}

        {mode !== 'verify' && mode !== 'reset-request' ? (
          <TextInput
            placeholder={mode === 'reset-confirm' ? 'New password' : 'Password'}
            placeholderTextColor={palette.muted}
            value={mode === 'reset-confirm' ? newPassword : password}
            onChangeText={mode === 'reset-confirm' ? setNewPassword : setPassword}
            secureTextEntry
            style={styles.input}
          />
        ) : null}

        {mode === 'verify' || mode === 'reset-confirm' ? (
          <TextInput
            placeholder="6-digit code"
            placeholderTextColor={palette.muted}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            style={styles.input}
          />
        ) : null}

        <Pressable
          style={[styles.primaryButton, session.loading && styles.disabled]}
          disabled={session.loading}
          onPress={() => {
            if (mode === 'login') return void handleLogin();
            if (mode === 'register') return void handleRegister();
            if (mode === 'verify') return void handleVerify();
            if (mode === 'reset-request') return void handleRequestReset();
            return void handleResetConfirm();
          }}
        >
          <Text style={styles.primaryButtonText}>
            {session.loading ? 'Please wait...' : actionLabel(mode)}
          </Text>
        </Pressable>

        {session.error ? <Text style={styles.errorText}>{session.error}</Text> : null}
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

        <View style={styles.modeRow}>
          {(['login', 'register', 'verify', 'reset-request'] as Mode[]).map((item) => (
            <Pressable key={item} onPress={() => setMode(item)} style={styles.modeButton}>
              <Text style={styles.modeButtonText}>{shortLabel(item)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function label(mode: Mode) {
  if (mode === 'login') return 'Sign in';
  if (mode === 'register') return 'Register';
  if (mode === 'verify') return 'Verify email';
  if (mode === 'reset-request') return 'Request reset';
  return 'Reset password';
}

function actionLabel(mode: Mode) {
  if (mode === 'login') return 'Sign in';
  if (mode === 'register') return 'Create account';
  if (mode === 'verify') return 'Verify';
  if (mode === 'reset-request') return 'Send reset code';
  return 'Update password';
}

function shortLabel(mode: Mode) {
  if (mode === 'reset-request') return 'reset';
  return mode;
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    panel: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.line,
      backgroundColor: palette.card,
      padding: 16,
      gap: 10,
    },
    badge: {
      color: palette.accent,
      fontSize: 11,
      letterSpacing: 2,
      fontWeight: '700',
    },
    title: {
      color: palette.text,
      fontSize: 24,
      fontWeight: '700',
    },
    subtitle: {
      color: palette.muted,
      fontSize: 13,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.line,
      backgroundColor: palette.cardSoft,
      color: palette.text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    primaryButton: {
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: palette.accent,
      marginTop: 4,
    },
    primaryButtonText: {
      color: palette.accentText,
      fontWeight: '700',
      fontSize: 14,
    },
    disabled: {
      opacity: 0.6,
    },
    errorText: {
      color: palette.danger,
      fontSize: 13,
    },
    noticeText: {
      color: palette.accent,
      fontSize: 13,
    },
    modeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    modeButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.line,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: palette.cardSoft,
    },
    modeButtonText: {
      color: palette.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  });
}
