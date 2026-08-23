/**
 * In-app replacement for `Alert.alert`.
 *
 * `Alert` is unimplemented in react-native-web, so on the web build every
 * validation message and the photo-source chooser were silent no-ops. Rather
 * than split this into native/web shims, this is a single implementation built
 * on RN `Modal` (which react-native-web does implement), so both platforms get
 * the same look and the same three-option chooser.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '@/constants/colors';

export type DialogOptionStyle = 'default' | 'cancel' | 'destructive';

export interface DialogOption<T = string> {
  label: string;
  value: T;
  style?: DialogOptionStyle;
}

interface DialogRequest {
  title: string;
  message?: string;
  options: DialogOption<any>[];
  /** Tapping the backdrop / hardware back resolves with this. */
  dismissValue: any;
}

interface DialogApi {
  /** Single-button informational dialog. */
  alert(title: string, message?: string): Promise<void>;
  /** Multi-option chooser. Resolves to the chosen `value`, or `null` if dismissed. */
  choose<T>(title: string, message: string | undefined, options: DialogOption<T>[]): Promise<T | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const resolverRef = useRef<((value: any) => void) | null>(null);

  const settle = useCallback((value: any) => {
    setRequest(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(value);
  }, []);

  const present = useCallback((next: DialogRequest) => {
    // If a dialog is somehow already open, settle it first so its caller
    // never hangs waiting on a promise that can no longer resolve.
    resolverRef.current?.(next.dismissValue);
    return new Promise<any>(resolve => {
      resolverRef.current = resolve;
      setRequest(next);
    });
  }, []);

  const api = useMemo<DialogApi>(() => ({
    alert(title, message) {
      return present({
        title,
        message,
        options: [{ label: 'OK', value: undefined }],
        dismissValue: undefined,
      }).then(() => undefined);
    },
    choose(title, message, options) {
      return present({ title, message, options, dismissValue: null });
    },
  }), [present]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        visible={request !== null}
        transparent
        animationType="fade"
        onRequestClose={() => request && settle(request.dismissValue)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => request && settle(request.dismissValue)}
        >
          {/* Stop taps inside the card from dismissing. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{request?.title}</Text>
            {!!request?.message && <Text style={styles.message}>{request.message}</Text>}
            <View style={styles.actions}>
              {request?.options.map((opt, i) => (
                <TouchableOpacity
                  key={`${opt.label}-${i}`}
                  style={[
                    styles.button,
                    opt.style === 'cancel' && styles.buttonCancel,
                    opt.style === 'destructive' && styles.buttonDestructive,
                  ]}
                  onPress={() => settle(opt.value)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      opt.style === 'cancel' && styles.buttonTextCancel,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 22,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  message: { fontSize: 15, color: C.textSec, lineHeight: 21 },
  actions: { gap: 8, marginTop: 12 },
  button: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonCancel: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.border },
  buttonDestructive: { backgroundColor: C.red },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  buttonTextCancel: { color: C.textSec },
});
