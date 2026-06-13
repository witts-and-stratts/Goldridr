import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScrollView as ExpoScrollView } from "@expo/ui";
import { BottomSheet, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FieldLabel } from "@/components/field-label";
import {
  NativeButton,
  NativePicker,
  NativeSwitch,
  NativeTextField,
} from "@/components/native-controls";
import { NativeIcon, NativeIconButton } from "@/components/native-icon";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import { formatMoney } from "@/lib/money";
import type { DiscountCode, DiscountKind } from "@/lib/types";

const EMPTY_FORM = {
  code: "",
  label: "",
  kind: "percent" as DiscountKind,
  value: "",
  maxRedemptions: "",
  expiresOn: "",
};

function discountAmount( code: DiscountCode ): string {
  return code.kind === "percent"
    ? `${ code.value }% off`
    : `${ formatMoney( Math.round( code.value * 100 ) ) } off`;
}

export default function DiscountsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [ codes, setCodes ] = useState<DiscountCode[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ formOpen, setFormOpen ] = useState( false );
  const [ form, setForm ] = useState( EMPTY_FORM );
  const [ isSubmitting, setIsSubmitting ] = useState( false );
  const [ search, setSearch ] = useState( "" );
  const [ statusFilter, setStatusFilter ] = useState( "all" );
  const [ usageId, setUsageId ] = useState<number | null>( null );

  const load = useCallback( async () => {
    if ( !token ) return;
    try {
      const result = await api.getDiscountCodes( token );
      setCodes( result.discountCodes );
      setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to load discount codes" );
    } finally {
      setIsLoading( false );
    }
  }, [ token ] );

  useFocusEffect(
    useCallback( () => {
      load();
    }, [ load ] )
  );

  const handleRefresh = async () => {
    setIsRefreshing( true );
    await load();
    setIsRefreshing( false );
  };

  const handleCreate = async () => {
    if ( !token ) return;
    const value = Number.parseFloat( form.value );
    if ( form.code.trim().length < 2 || form.label.trim().length < 2 ) {
      setError( "Code and label are required (2+ characters)" );
      return;
    }
    if ( Number.isNaN( value ) || value <= 0 ) {
      setError( "Enter a positive discount value" );
      return;
    }
    const maxRedemptions = form.maxRedemptions.trim()
      ? Number.parseInt( form.maxRedemptions, 10 )
      : null;
    if ( maxRedemptions !== null && ( Number.isNaN( maxRedemptions ) || maxRedemptions <= 0 ) ) {
      setError( "Max redemptions must be a positive number" );
      return;
    }
    let expiresAt: string | null = null;
    if ( form.expiresOn.trim() ) {
      if ( !/^\d{4}-\d{2}-\d{2}$/.test( form.expiresOn.trim() ) ) {
        setError( "Expiry must be formatted YYYY-MM-DD" );
        return;
      }
      expiresAt = new Date( `${ form.expiresOn.trim() }T23:59:59Z` ).toISOString();
    }

    setIsSubmitting( true );
    try {
      await api.createDiscountCode( token, {
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        kind: form.kind,
        value,
        maxRedemptions,
        expiresAt,
      } );
      setForm( EMPTY_FORM );
      setFormOpen( false );
      setError( null );
      await load();
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to create discount code" );
    } finally {
      setIsSubmitting( false );
    }
  };

  const handleToggleActive = async ( code: DiscountCode, active: boolean ) => {
    if ( !token ) return;
    setCodes( ( current ) =>
      current.map( ( c ) => ( c.id === code.id ? { ...c, active: active ? 1 : 0 } : c ) )
    );
    try {
      await api.updateDiscountCode( token, { id: code.id, active } );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to update discount code" );
      await load();
    }
  };

  const handleDelete = ( code: DiscountCode ) => {
    Alert.alert( "Delete discount code", `Delete ${ code.code }? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if ( !token ) return;
          try {
            await api.deleteDiscountCode( token, code.id );
            setCodes( ( current ) => current.filter( ( c ) => c.id !== code.id ) );
          } catch ( err ) {
            setError( err instanceof Error ? err.message : "Failed to delete discount code" );
          }
        },
      },
    ] );
  };

  const statusFor = ( code: DiscountCode ) => {
    if ( !code.active ) return "disabled";
    if ( code.expiresAt && new Date( code.expiresAt ).getTime() <= Date.now() ) return "expired";
    if ( code.maxRedemptions !== null && code.redemptions >= code.maxRedemptions ) return "exhausted";
    return "active";
  };

  const summary = useMemo( () => ( {
    total: codes.length,
    active: codes.filter( code => statusFor( code ) === "active" ).length,
    redemptions: codes.reduce( ( total, code ) => total + code.trackedRedemptions, 0 ),
    discounted: codes.reduce( ( total, code ) => total + code.totalDiscountCents, 0 ),
  } ), [ codes ] );

  const filteredCodes = useMemo( () => {
    const query = search.trim().toLowerCase();
    return codes.filter( code =>
      ( !query || code.code.toLowerCase().includes( query ) || code.label.toLowerCase().includes( query ) )
      && ( statusFilter === "all" || statusFor( code ) === statusFilter )
    );
  }, [ codes, search, statusFilter ] );

  return (
    <ScrollView
      style={ styles.container }
      contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 32 } ] }
      refreshControl={
        <RefreshControl refreshing={ isRefreshing } onRefresh={ handleRefresh } tintColor={ colors.gold } />
      }
    >
      { error && <Text style={ styles.error }>{ error }</Text> }

      <View style={ styles.summaryGrid }>
        <Summary label="Codes" value={ String( summary.total ) } />
        <Summary label="Active" value={ String( summary.active ) } />
        <Summary label="Redemptions" value={ String( summary.redemptions ) } />
        <Summary label="Discounted" value={ formatMoney( summary.discounted ) } />
      </View>

      { formOpen ? null : (
        <NativeButton
          label="New discount code"
          icon={ { ios: "plus", android: "add", web: "add" } }
          onPress={ () => setFormOpen( true ) }
        />
      ) }

      <NativeTextField
        value={ search }
        onChangeText={ setSearch }
        placeholder="Search code or campaign"
      />
      <ExpoScrollView direction="horizontal" showsIndicators={ false } style={ styles.filterRail }>
        <View style={ styles.filters }>
          { [ "all", "active", "disabled", "expired", "exhausted" ].map( status => (
            <NativeButton
              key={ status }
              label={ status === "exhausted" ? "Limit reached" : status.charAt( 0 ).toUpperCase() + status.slice( 1 ) }
              variant={ statusFilter === status ? "filled" : "outlined" }
              compact
              onPress={ () => setStatusFilter( status ) }
            />
          ) ) }
        </View>
      </ExpoScrollView>

      <View style={ styles.list }>
        { isLoading ? (
          <ActivityIndicator color={ colors.gold } style={ styles.loader } />
        ) : filteredCodes.length === 0 ? (
          <View style={ styles.empty }>
            <NativeIcon
              name={ { ios: "tag", android: "sell", web: "sell" } }
              color={ colors.faint }
              size={ 34 }
            />
            <Text style={ styles.emptyTitle }>No discount codes</Text>
            <Text style={ styles.emptyBody }>
              Create a code and riders can apply it at checkout on the website.
            </Text>
          </View>
        ) : (
          filteredCodes.map( ( code ) => (
            <View key={ code.id } style={ styles.card }>
              <View style={ styles.cardHeader }>
                <View style={ styles.cardHeading }>
                  <Text style={ styles.cardCode }>{ code.code }</Text>
                  <Text style={ styles.cardLabel } numberOfLines={ 1 }>{ code.label }</Text>
                </View>
                <NativeSwitch
                  value={ code.active === 1 }
                  onValueChange={ ( active ) => handleToggleActive( code, active ) }
                />
              </View>

              <View style={ styles.cardDivider } />

              <View style={ styles.cardMetaRow }>
                <Text style={ styles.cardAmount }>{ discountAmount( code ) }</Text>
                <Text style={ styles.cardMeta }>
                  { code.redemptions } used
                  { code.maxRedemptions ? ` of ${ code.maxRedemptions }` : "" }
                  { code.totalDiscountCents
                    ? ` · ${ formatMoney( code.totalDiscountCents ) } discounted`
                    : "" }
                </Text>
                <NativeIconButton
                  accessibilityLabel={ `Delete ${ code.code }` }
                  name={ { ios: "trash", android: "delete", web: "delete" } }
                  color={ colors.red }
                  size={ 18 }
                  onPress={ () => handleDelete( code ) }
                />
              </View>

              { code.expiresAt && (
                <Text style={ styles.cardExpiry }>
                  Expires { code.expiresAt.slice( 0, 10 ) }
                </Text>
              ) }
              <NativeButton
                label={ usageId === code.id ? "Hide usage" : `View ${ code.trackedRedemptions } tracked redemptions` }
                variant="text"
                compact
                onPress={ () => setUsageId( usageId === code.id ? null : code.id ) }
              />
              { usageId === code.id ? (
                <View style={ styles.usageList }>
                  { code.usages.length === 0 ? (
                    <Text style={ styles.usageEmpty }>No stored booking redemptions.</Text>
                  ) : code.usages.map( usage => (
                    <View key={ usage.bookingReference } style={ styles.usageRow }>
                      <View style={ styles.usageText }>
                        <Text style={ styles.usageTitle }>
                          { usage.bookingReference } · { usage.customerName }
                        </Text>
                        <Text style={ styles.usageDetail }>
                          { usage.tripDate } · { formatMoney( usage.originalAmountCents ) } → { formatMoney( usage.finalAmountCents ) }
                        </Text>
                      </View>
                      <Text style={ styles.usageAmount }>-{ formatMoney( usage.discountAmountCents ) }</Text>
                    </View>
                  ) ) }
                </View>
              ) : null }
            </View>
          ) )
        ) }
      </View>

      <BottomSheet
        index={ formOpen ? 0 : -1 }
        onDismiss={ () => {
          setFormOpen( false );
          setForm( EMPTY_FORM );
        } }
        enablePanDownToClose
        enableDynamicSizing
        backgroundStyle={ styles.sheetBackground }
      >
        <BottomSheetScrollView
          contentContainerStyle={ [
            styles.sheetContent,
            { paddingBottom: 24 },
          ] }
        >
          <Text style={ [ plate, styles.sheetTitle ] }>New discount code</Text>

          <FieldLabel label="Code" icon={ { ios: "tag", android: "sell", web: "sell" } } />
          <NativeTextField
            value={ form.code }
            onChangeText={ ( code ) => setForm( ( f ) => ( { ...f, code } ) ) }
            placeholder="WELCOME15"
            autoCapitalize="characters"
            autoCorrect={ false }
          />

          <FieldLabel label="Label" icon={ { ios: "text.quote", android: "notes", web: "notes" } } />
          <NativeTextField
            value={ form.label }
            onChangeText={ ( label ) => setForm( ( f ) => ( { ...f, label } ) ) }
            placeholder="Welcome offer for new riders"
          />

          <FieldLabel label="Type" icon={ { ios: "percent", android: "percent", web: "percent" } } />
          <NativePicker
            options={ [
              { label: "Percent off", value: "percent" },
              { label: "Fixed amount off", value: "fixed" },
            ] }
            selectedValue={ form.kind }
            onValueChange={ ( kind ) => setForm( ( f ) => ( { ...f, kind: kind as DiscountKind } ) ) }
          />

          <FieldLabel
            label={ form.kind === "percent" ? "Percent (1–100)" : "Amount (dollars)" }
            icon={ { ios: "number", android: "tag", web: "tag" } }
          />
          <NativeTextField
            value={ form.value }
            onChangeText={ ( value ) => setForm( ( f ) => ( { ...f, value } ) ) }
            placeholder={ form.kind === "percent" ? "15" : "10.00" }
            keyboardType="decimal-pad"
          />

          <FieldLabel
            label="Max redemptions (optional)"
            icon={ { ios: "person.3", android: "groups", web: "groups" } }
          />
          <NativeTextField
            value={ form.maxRedemptions }
            onChangeText={ ( maxRedemptions ) => setForm( ( f ) => ( { ...f, maxRedemptions } ) ) }
            placeholder="Unlimited"
            keyboardType="number-pad"
          />

          <FieldLabel
            label="Expires on (optional, YYYY-MM-DD)"
            icon={ { ios: "calendar.badge.clock", android: "event", web: "event" } }
          />
          <NativeTextField
            value={ form.expiresOn }
            onChangeText={ ( expiresOn ) => setForm( ( f ) => ( { ...f, expiresOn } ) ) }
            placeholder="2026-12-31"
            autoCorrect={ false }
          />

          <View style={ styles.sheetActions }>
            <NativeButton
              label="Cancel"
              variant="outlined"
              compact
              onPress={ () => {
                setFormOpen( false );
                setForm( EMPTY_FORM );
              } }
            />
            <NativeButton
              label={ isSubmitting ? "Creating" : "Create code" }
              compact
              disabled={ isSubmitting }
              onPress={ handleCreate }
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </ScrollView>
  );
}

function Summary( { label, value }: { label: string; value: string } ) {
  return (
    <View style={ styles.summary }>
      <Text style={ styles.summaryValue }>{ value }</Text>
      <Text style={ styles.summaryLabel }>{ label }</Text>
    </View>
  );
}

const styles = StyleSheet.create( {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summary: {
    minWidth: "46%",
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    backgroundColor: colors.panel,
  },
  summaryValue: { color: colors.ivory, fontSize: 18, fontWeight: "700" },
  summaryLabel: { color: colors.faint, fontSize: 10, textTransform: "uppercase", marginTop: 4 },
  filterRail: {
    height: 48,
  },
  filters: { gap: 8, flexDirection: "row" },
  list: {
    gap: 12,
  },
  loader: {
    marginTop: 48,
  },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  usageList: { borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 8, gap: 8 },
  usageRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  usageText: { flex: 1 },
  usageTitle: { color: colors.ivory, fontSize: 12, fontWeight: "600" },
  usageDetail: { color: colors.faint, fontSize: 11, marginTop: 2 },
  usageAmount: { color: colors.gold, fontSize: 12 },
  usageEmpty: { color: colors.muted, fontSize: 12 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeading: {
    flex: 1,
    gap: 2,
  },
  cardCode: {
    color: colors.ivory,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  cardLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.hairline,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardAmount: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "600",
  },
  cardMeta: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
  },
  cardExpiry: {
    color: colors.faint,
    fontSize: 12,
  },
  empty: {
    paddingVertical: 56,
    gap: 10,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "600",
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  error: {
    color: colors.red,
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
  sheetTitle: {
    color: colors.gold,
    marginBottom: 4,
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
} );
