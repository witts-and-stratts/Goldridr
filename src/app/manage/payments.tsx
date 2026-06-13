import { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FieldLabel } from "@/components/field-label";
import { NativeButton, NativePicker, NativeTextField } from "@/components/native-controls";
import { NativeIcon, NativeIconButton } from "@/components/native-icon";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import { formatMoney, parseMoney } from "@/lib/money";
import type { DriverRide, Payment, PaymentMethod, PaymentStatus } from "@/lib/types";

const STATUS_OPTIONS: { label: string; value: PaymentStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Refunded", value: "refunded" },
  { label: "Failed", value: "failed" },
];

const METHOD_OPTIONS: { label: string; value: PaymentMethod }[] = [
  { label: "Card", value: "card" },
  { label: "Cash", value: "cash" },
  { label: "Bank transfer", value: "bank_transfer" },
  { label: "Other", value: "other" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: colors.amber,
  paid: colors.gold,
  refunded: colors.muted,
  failed: colors.red,
};

const EMPTY_FORM = {
  bookingReference: "",
  amount: "",
  method: "card" as PaymentMethod,
  status: "paid" as PaymentStatus,
  transactionReference: "",
  notes: "",
};

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [ payments, setPayments ] = useState<Payment[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ formOpen, setFormOpen ] = useState( false );
  const [ form, setForm ] = useState( EMPTY_FORM );
  const [ isSubmitting, setIsSubmitting ] = useState( false );
  const [ expandedId, setExpandedId ] = useState<number | null>( null );
  const [ bookings, setBookings ] = useState<DriverRide[]>( [] );
  const [ search, setSearch ] = useState( "" );
  const [ statusFilter, setStatusFilter ] = useState( "all" );

  const load = useCallback( async () => {
    if ( !token ) return;
    try {
      const [ paymentResult, rideResult ] = await Promise.all( [
        api.getPayments( token ),
        api.getRides( token ),
      ] );
      setPayments( paymentResult.payments );
      setBookings( rideResult.rides );
      setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to load payments" );
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
    const amountCents = parseMoney( form.amount );
    if ( !form.bookingReference.trim() ) {
      setError( "A booking reference is required" );
      return;
    }
    if ( amountCents === null ) {
      setError( "Enter a valid amount" );
      return;
    }
    setIsSubmitting( true );
    try {
      await api.createPayment( token, {
        bookingReference: form.bookingReference.trim().toUpperCase(),
        amountCents,
        method: form.method,
        status: form.status,
        transactionReference: form.transactionReference.trim() || null,
        notes: form.notes.trim() || null,
      } );
      setForm( EMPTY_FORM );
      setFormOpen( false );
      setError( null );
      await load();
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to record payment" );
    } finally {
      setIsSubmitting( false );
    }
  };

  const handleStatusChange = async ( payment: Payment, status: PaymentStatus ) => {
    if ( !token || payment.status === status ) return;
    setPayments( ( current ) =>
      current.map( ( p ) => ( p.id === payment.id ? { ...p, status } : p ) )
    );
    try {
      await api.updatePayment( token, { id: payment.id, status } );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to update payment" );
      await load();
    }
  };

  const handleDelete = ( payment: Payment ) => {
    Alert.alert(
      "Delete payment",
      `Delete the ${ formatMoney( payment.amountCents, payment.currency ) } payment for ${ payment.bookingReference }?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if ( !token ) return;
            try {
              await api.deletePayment( token, payment.id );
              setPayments( ( current ) => current.filter( ( p ) => p.id !== payment.id ) );
            } catch ( err ) {
              setError( err instanceof Error ? err.message : "Failed to delete payment" );
            }
          },
        },
      ]
    );
  };

  const summary = useMemo( () => ( {
    paid: payments.filter( payment => payment.status === "paid" )
      .reduce( ( total, payment ) => total + payment.amountCents, 0 ),
    pending: payments.filter( payment => payment.status === "pending" )
      .reduce( ( total, payment ) => total + payment.amountCents, 0 ),
    refunded: payments.filter( payment => payment.status === "refunded" )
      .reduce( ( total, payment ) => total + payment.amountCents, 0 ),
  } ), [ payments ] );

  const filteredPayments = useMemo( () => {
    const query = search.trim().toLowerCase();
    return payments.filter( payment =>
      ( statusFilter === "all" || payment.status === statusFilter )
      && ( !query || [
        payment.bookingReference,
        payment.customerName,
        payment.customerEmail,
        payment.transactionReference,
      ].some( value => value?.toLowerCase().includes( query ) ) )
    );
  }, [ payments, search, statusFilter ] );

  const selectBooking = ( reference: string ) => {
    const booking = bookings.find( item => item.reference === reference );
    const amount = booking?.estimatedPrice
      ? booking.estimatedPrice.replace( /[^0-9.]/g, "" )
      : "";
    setForm( current => ( { ...current, bookingReference: reference, amount } ) );
  };

  return (
    <ScrollView
      style={ styles.container }
      contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 32 } ] }
      refreshControl={
        <RefreshControl refreshing={ isRefreshing } onRefresh={ handleRefresh } tintColor={ colors.gold } />
      }
    >
      { error && <Text style={ styles.error }>{ error }</Text> }

      <View style={ styles.summaryRow }>
        <Summary label="Paid" value={ formatMoney( summary.paid ) } />
        <Summary label="Pending" value={ formatMoney( summary.pending ) } />
        <Summary label="Refunded" value={ formatMoney( summary.refunded ) } />
      </View>

      { formOpen ? null : (
        <NativeButton
          label="Record payment"
          icon={ { ios: "plus", android: "add", web: "add" } }
          onPress={ () => setFormOpen( true ) }
        />
      ) }

      <NativeTextField
        value={ search }
        onChangeText={ setSearch }
        placeholder="Search customer, booking, or transaction"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={ false } contentContainerStyle={ styles.filters }>
        { [ "all", ...STATUS_OPTIONS.map( option => option.value ) ].map( status => (
          <Pressable
            key={ status }
            onPress={ () => setStatusFilter( status ) }
            style={ [ styles.filter, statusFilter === status && styles.filterSelected ] }
          >
            <Text style={ [ styles.filterText, statusFilter === status && styles.filterTextSelected ] }>
              { status.charAt( 0 ).toUpperCase() + status.slice( 1 ) }
            </Text>
          </Pressable>
        ) ) }
      </ScrollView>

      <View style={ styles.list }>
        { isLoading ? (
          <ActivityIndicator color={ colors.gold } style={ styles.loader } />
        ) : filteredPayments.length === 0 ? (
          <View style={ styles.empty }>
            <NativeIcon
              name={ { ios: "creditcard", android: "credit_card", web: "credit_card" } }
              color={ colors.faint }
              size={ 34 }
            />
            <Text style={ styles.emptyTitle }>No payments recorded</Text>
            <Text style={ styles.emptyBody }>
              Payments you record against bookings appear here for
              reconciliation.
            </Text>
          </View>
        ) : (
          filteredPayments.map( ( payment ) => {
            const statusColor = STATUS_COLORS[ payment.status ] ?? colors.muted;
            const isExpanded = expandedId === payment.id;
            return (
              <Pressable
                key={ payment.id }
                accessibilityRole="button"
                accessibilityLabel={ `Payment for ${ payment.bookingReference }` }
                onPress={ () => setExpandedId( isExpanded ? null : payment.id ) }
                style={ ( { pressed } ) => [ styles.card, pressed && styles.cardPressed ] }
              >
                <View style={ styles.cardHeader }>
                  <View style={ styles.cardHeading }>
                    <Text style={ styles.cardTitle }>
                      { formatMoney( payment.amountCents, payment.currency ) }
                    </Text>
                    <Text style={ styles.cardCaption } numberOfLines={ 1 }>
                      { payment.bookingReference }
                      { payment.customerName ? ` · ${ payment.customerName }` : "" }
                    </Text>
                  </View>
                  <Text style={ [ styles.statusPill, { color: statusColor, borderColor: statusColor } ] }>
                    { payment.status }
                  </Text>
                </View>

                <Text style={ styles.cardMeta }>
                  { METHOD_OPTIONS.find( ( m ) => m.value === payment.method )?.label ?? payment.method }
                  { " · " }
                  { payment.createdAt.slice( 0, 10 ) }
                  { payment.transactionReference ? ` · ${ payment.transactionReference }` : "" }
                </Text>

                { isExpanded && (
                  <View style={ styles.cardActions }>
                    <View style={ styles.cardPicker }>
                      <NativePicker
                        options={ STATUS_OPTIONS }
                        selectedValue={ payment.status as PaymentStatus }
                        onValueChange={ ( status ) =>
                          handleStatusChange( payment, status as PaymentStatus ) }
                      />
                    </View>
                    <NativeIconButton
                      accessibilityLabel={ `Delete payment for ${ payment.bookingReference }` }
                      name={ { ios: "trash", android: "delete", web: "delete" } }
                      color={ colors.red }
                      size={ 18 }
                      onPress={ () => handleDelete( payment ) }
                    />
                  </View>
                ) }
              </Pressable>
            );
          } )
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
          contentContainerStyle={ [ styles.sheetContent, { paddingBottom: 24 } ] }
        >
          <Text style={ [ plate, styles.sheetTitle ] }>Record payment</Text>

          <FieldLabel
            label="Booking reference"
            icon={ { ios: "number", android: "tag", web: "tag" } }
          />
          <NativePicker
            options={ [
              { label: "Choose a booking", value: "" },
              ...bookings.map( booking => ( {
                label: `${ booking.reference } · ${ booking.customerName }${ [ "cancelled", "rejected" ].includes( booking.status ) ? " · Cancelled" : "" }`,
                value: booking.reference,
              } ) ),
            ] }
            selectedValue={ form.bookingReference }
            onValueChange={ selectBooking }
          />

          <FieldLabel
            label="Amount (USD)"
            icon={ { ios: "dollarsign.circle", android: "attach_money", web: "attach_money" } }
          />
          <NativeTextField
            value={ form.amount }
            onChangeText={ ( amount ) => setForm( ( f ) => ( { ...f, amount } ) ) }
            placeholder="120.00"
            keyboardType="decimal-pad"
          />

          <FieldLabel
            label="Method"
            icon={ { ios: "creditcard", android: "credit_card", web: "credit_card" } }
          />
          <NativePicker
            options={ METHOD_OPTIONS }
            selectedValue={ form.method }
            onValueChange={ ( method ) => setForm( ( f ) => ( { ...f, method: method as PaymentMethod } ) ) }
          />

          <FieldLabel
            label="Status"
            icon={ { ios: "checkmark.seal", android: "verified", web: "verified" } }
          />
          <NativePicker
            options={ STATUS_OPTIONS }
            selectedValue={ form.status }
            onValueChange={ ( status ) => setForm( ( f ) => ( { ...f, status: status as PaymentStatus } ) ) }
          />

          <FieldLabel
            label="Transaction reference (optional)"
            icon={ { ios: "doc.text", android: "receipt", web: "receipt" } }
          />
          <NativeTextField
            value={ form.transactionReference }
            onChangeText={ ( transactionReference ) =>
              setForm( ( f ) => ( { ...f, transactionReference } ) ) }
            placeholder="Processor or check number"
            autoCorrect={ false }
          />

          <FieldLabel
            label="Notes (optional)"
            icon={ { ios: "text.alignleft", android: "notes", web: "notes" } }
          />
          <NativeTextField
            value={ form.notes }
            onChangeText={ ( notes ) => setForm( ( f ) => ( { ...f, notes } ) ) }
            placeholder="Anything worth remembering"
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
              label={ isSubmitting ? "Saving" : "Save payment" }
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
  summaryRow: { flexDirection: "row", gap: 8 },
  summary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    backgroundColor: colors.panel,
    padding: 12,
  },
  summaryValue: { color: colors.ivory, fontSize: 14, fontWeight: "700" },
  summaryLabel: { color: colors.faint, fontSize: 9, textTransform: "uppercase", marginTop: 4 },
  filters: { gap: 8 },
  filter: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterSelected: { borderColor: colors.gold, backgroundColor: "rgba(194, 158, 102, 0.12)" },
  filterText: { color: colors.muted, fontSize: 12 },
  filterTextSelected: { color: colors.gold },
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
    gap: 8,
  },
  cardPressed: {
    backgroundColor: colors.raised,
    borderColor: colors.hairlineStrong,
  },
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
  cardTitle: {
    color: colors.ivory,
    fontSize: 17,
    fontWeight: "700",
  },
  cardCaption: {
    color: colors.muted,
    fontSize: 12,
  },
  statusPill: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    overflow: "hidden",
  },
  cardMeta: {
    color: colors.faint,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  cardPicker: {
    flex: 1,
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
