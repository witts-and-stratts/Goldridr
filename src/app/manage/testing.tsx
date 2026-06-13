import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BottomSheet, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { Redirect, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeButton, NativeTextField } from "@/components/native-controls";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import type { MockSmsMessage } from "@/lib/types";

export default function TestingScreen() {
  const insets = useSafeAreaInsets();
  const { token, isAdmin } = useAuth();
  const [ messages, setMessages ] = useState<MockSmsMessage[]>( [] );
  const [ to, setTo ] = useState( "+17135550123" );
  const [ from, setFrom ] = useState( "+17135550000" );
  const [ body, setBody ] = useState( "Goldridr test SMS from the mobile admin." );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ isSending, setIsSending ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ sheetOpen, setSheetOpen ] = useState( false );

  const load = useCallback( async () => {
    if ( !token ) return;
    try {
      const result = await api.getMockSmsMessages( token );
      setMessages( result.messages );
      setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to load mock SMS inbox" );
    } finally {
      setIsLoading( false );
    }
  }, [ token ] );

  useFocusEffect( useCallback( () => { void load(); }, [ load ] ) );

  if ( !isAdmin ) return <Redirect href="/" />;

  const send = async () => {
    if ( !token || !to.trim() || !from.trim() || !body.trim() ) return;
    setIsSending( true );
    try {
      const result = await api.createMockSms( token, {
        to: to.trim(),
        from: from.trim(),
        body: body.trim(),
      } );
      setMessages( current => [ result.message, ...current ] );
      setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to queue mock SMS" );
    } finally {
      setIsSending( false );
    }
  };

  const updateStatus = async ( message: MockSmsMessage, status: "delivered" | "failed" ) => {
    if ( !token ) return;
    try {
      await api.updateMockSmsStatus( token, message.sid, status );
      setMessages( current => current.map( item =>
        item.sid === message.sid ? { ...item, status, dateUpdated: new Date().toISOString() } : item
      ) );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to update mock SMS" );
    }
  };

  const clear = () => {
    Alert.alert( "Clear mock SMS inbox", "Delete every mock SMS message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          if ( !token ) return;
          await api.clearMockSmsMessages( token );
          setMessages( [] );
        },
      },
    ] );
  };

  return (
    <ScrollView
      style={ styles.container }
      contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 32 } ] }
      refreshControl={
        <RefreshControl
          refreshing={ isRefreshing }
          onRefresh={ async () => {
            setIsRefreshing( true );
            await load();
            setIsRefreshing( false );
          } }
          tintColor={ colors.gold }
        />
      }
    >
      <NativeButton
        label="Queue mock SMS"
        icon={ { ios: "paperplane", android: "send", web: "send" } }
        onPress={ () => setSheetOpen( true ) }
      />

      <BottomSheet
        index={ sheetOpen ? 0 : -1 }
        onDismiss={ () => {
          setSheetOpen( false );
        } }
        enablePanDownToClose
        enableDynamicSizing
        backgroundStyle={ styles.sheetBackground }
      >
        <BottomSheetScrollView
          contentContainerStyle={ [ styles.sheetContent, { paddingBottom: 24 } ] }
        >
          <Text style={ [ plate, styles.sectionTitle ] }>Queue mock SMS</Text>
          <View style={ styles.card }>
            <NativeTextField
              value={ to }
              onChangeText={ setTo }
              placeholder="To"
              keyboardType="phone-pad"
            />
            <NativeTextField
              value={ from }
              onChangeText={ setFrom }
              placeholder="From"
              keyboardType="phone-pad"
            />
            <NativeTextField
              value={ body }
              onChangeText={ setBody }
              placeholder="Message"
              multiline
            />
            <View style={ styles.formActions }>
              <NativeButton
                label="Cancel"
                variant="outlined"
                compact
                onPress={ () => setSheetOpen( false ) }
              />
              <NativeButton
                label={ isSending ? "Queueing" : "Queue mock SMS" }
                disabled={ isSending }
                icon={ { ios: "paperplane", android: "send", web: "send" } }
                onPress={ async () => {
                  await send();
                  setSheetOpen( false );
                } }
              />
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      <View style={ styles.sectionHeader }>
        <Text style={ [ plate, styles.sectionTitle ] }>Mock SMS inbox</Text>
        <Pressable onPress={ clear }>
          <Text style={ styles.clear }>Clear all</Text>
        </Pressable>
      </View>
      { error ? <Text style={ styles.error }>{ error }</Text> : null }
      { isLoading ? <ActivityIndicator color={ colors.gold } /> : null }
      { !isLoading && messages.length === 0 ? <Text style={ styles.empty }>No mock SMS messages.</Text> : null }
      { messages.map( message => (
        <View key={ message.sid } style={ styles.messageCard }>
          <View style={ styles.messageHeader }>
            <Text style={ styles.phone }>{ message.to }</Text>
            <Text style={ styles.status }>{ message.status }</Text>
          </View>
          <Text style={ styles.body }>{ message.body }</Text>
          <Text style={ styles.date }>{ new Date( message.dateCreated ).toLocaleString() }</Text>
          <View style={ styles.actions }>
            <NativeButton
              label="Delivered"
              compact
              variant="outlined"
              onPress={ () => updateStatus( message, "delivered" ) }
            />
            <NativeButton
              label="Failed"
              compact
              variant="outlined"
              tone="danger"
              onPress={ () => updateStatus( message, "failed" ) }
            />
          </View>
        </View>
      ) ) }
    </ScrollView>
  );
}

const styles = StyleSheet.create( {
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  sectionTitle: { color: colors.gold, marginTop: 8 },
  card: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 16,
    backgroundColor: colors.panel,
  },
  sheetBackground: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: 12,
    color: colors.ivory,
    paddingHorizontal: 14,
    fontSize: 14,
    backgroundColor: colors.background,
  },
  bodyInput: { minHeight: 110, paddingTop: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clear: { color: colors.red, fontSize: 13 },
  error: { color: colors.red, fontSize: 13 },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: 24 },
  messageCard: {
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    backgroundColor: colors.panel,
  },
  messageHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  phone: { color: colors.ivory, fontSize: 14, fontWeight: "600" },
  status: { color: colors.gold, fontSize: 12, textTransform: "capitalize" },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  date: { color: colors.faint, fontSize: 11 },
  actions: { flexDirection: "row", gap: 8 },
} );
