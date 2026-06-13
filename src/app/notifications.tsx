import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NativeIcon, type NativeSymbolName } from "@/components/native-icon";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors, plate } from "@/lib/colors";
import { getNotificationsModule } from "@/lib/push";
import type { AppNotification } from "@/lib/types";

type NotificationFilter = "all" | "unread" | "bookings" | "reminders" | "messages" | "system";
type PermissionState = "granted" | "denied" | "undetermined" | "unavailable";

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "bookings", label: "Bookings" },
  { id: "reminders", label: "Reminders" },
  { id: "messages", label: "Messages" },
  { id: "system", label: "System" },
];

const CATEGORY_META: Record<string, { label: string; icon: NativeSymbolName; color: string }> = {
  bookings: {
    label: "Booking",
    icon: { ios: "calendar.badge.checkmark", android: "event_available", web: "event_available" },
    color: colors.gold,
  },
  reminders: {
    label: "Reminder",
    icon: { ios: "clock.fill", android: "schedule", web: "schedule" },
    color: "#7AA7D8",
  },
  messages: {
    label: "Message",
    icon: { ios: "message.fill", android: "chat", web: "chat" },
    color: "#8CBF9F",
  },
  system: {
    label: "System",
    icon: { ios: "gearshape.fill", android: "settings", web: "settings" },
    color: colors.muted,
  },
};

// SQLite CURRENT_TIMESTAMP is "YYYY-MM-DD HH:MM:SS" in UTC.
function parseTimestamp( value: string ): Date {
  return new Date( value.includes( "T" ) ? value : `${ value.replace( " ", "T" ) }Z` );
}

function timeAgo( value: string ): string {
  const elapsed = Date.now() - parseTimestamp( value ).getTime();
  const minutes = Math.floor( elapsed / 60_000 );
  if ( minutes < 1 ) return "Just now";
  if ( minutes < 60 ) return `${ minutes }m`;
  const hours = Math.floor( minutes / 60 );
  if ( hours < 24 ) return `${ hours }h`;
  const days = Math.floor( hours / 24 );
  if ( days < 7 ) return `${ days }d`;
  return parseTimestamp( value ).toLocaleDateString( undefined, {
    month: "short",
    day: "numeric",
  } );
}

function dateGroup( value: string ): string {
  const date = parseTimestamp( value );
  const today = new Date();
  const startOfToday = new Date( today.getFullYear(), today.getMonth(), today.getDate() );
  const startOfDate = new Date( date.getFullYear(), date.getMonth(), date.getDate() );
  const dayDifference = Math.round(
    ( startOfToday.getTime() - startOfDate.getTime() ) / 86_400_000
  );
  if ( dayDifference === 0 ) return "Today";
  if ( dayDifference === 1 ) return "Yesterday";
  if ( dayDifference < 7 ) {
    return date.toLocaleDateString( undefined, { weekday: "long" } );
  }
  return date.toLocaleDateString( undefined, { month: "long", year: "numeric" } );
}

function categoryMeta( category: string ) {
  return CATEGORY_META[ category ] ?? {
    label: category.charAt( 0 ).toUpperCase() + category.slice( 1 ),
    icon: { ios: "bell.fill", android: "notifications", web: "notifications" } as NativeSymbolName,
    color: colors.muted,
  };
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { token, isAdmin, signOut } = useAuth();
  const [ items, setItems ] = useState<AppNotification[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ isRefreshing, setIsRefreshing ] = useState( false );
  const [ isMarkingAllRead, setIsMarkingAllRead ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ query, setQuery ] = useState( "" );
  const [ activeFilter, setActiveFilter ] = useState<NotificationFilter>( "all" );
  const [ permission, setPermission ] = useState<PermissionState>(
    Platform.OS === "web" ? "unavailable" : "undetermined"
  );

  const loadPermission = useCallback( async () => {
    if ( Platform.OS === "web" ) return;
    const Notifications = getNotificationsModule();
    if ( !Notifications ) {
      setPermission( "unavailable" );
      return;
    }
    const result = await Notifications.getPermissionsAsync();
    const allowed = result.granted
      || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    setPermission( allowed ? "granted" : result.status );
  }, [] );

  const load = useCallback( async () => {
    if ( !token ) return;
    try {
      const result = await api.getNotifications( token, { limit: 100 } );
      setItems( result.notifications );
      setError( null );
      const Notifications = getNotificationsModule();
      if ( Platform.OS !== "web" && Notifications ) {
        await Notifications.setBadgeCountAsync( result.unreadCount );
      }
    } catch ( err ) {
      if ( err instanceof api.ApiError && err.status === 401 ) {
        await signOut();
        return;
      }
      setError( err instanceof Error ? err.message : "Failed to load notifications" );
    } finally {
      setIsLoading( false );
    }
  }, [ token, signOut ] );

  useFocusEffect(
    useCallback( () => {
      load();
      loadPermission().catch( () => setPermission( "unavailable" ) );
    }, [ load, loadPermission ] )
  );

  useEffect( () => {
    if ( Platform.OS === "web" ) return;
    const Notifications = getNotificationsModule();
    if ( !Notifications ) return;
    const subscription = Notifications.addNotificationReceivedListener( () => {
      load();
    } );
    return () => subscription.remove();
  }, [ load ] );

  const unreadCount = useMemo(
    () => items.reduce( ( count, item ) => count + ( item.readAt ? 0 : 1 ), 0 ),
    [ items ]
  );

  const categoryCounts = useMemo( () => {
    return items.reduce<Record<string, number>>( ( counts, item ) => {
      counts[ item.category ] = ( counts[ item.category ] ?? 0 ) + 1;
      return counts;
    }, {} );
  }, [ items ] );

  const visibleItems = useMemo( () => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter( ( item ) => {
      const matchesFilter = activeFilter === "all"
        || ( activeFilter === "unread" && !item.readAt )
        || item.category === activeFilter;
      if ( !matchesFilter ) return false;
      if ( !normalizedQuery ) return true;
      return [
        item.title,
        item.body,
        item.bookingReference ?? "",
        item.category,
      ].some( ( value ) => value.toLowerCase().includes( normalizedQuery ) );
    } );
  }, [ activeFilter, items, query ] );

  const groupedItems = useMemo( () => {
    return visibleItems.reduce<{ title: string; items: AppNotification[] }[]>( ( groups, item ) => {
      const title = dateGroup( item.createdAt );
      const current = groups[ groups.length - 1 ];
      if ( current?.title === title ) {
        current.items.push( item );
      } else {
        groups.push( { title, items: [ item ] } );
      }
      return groups;
    }, [] );
  }, [ visibleItems ] );

  const markRead = useCallback( async ( notification: AppNotification ) => {
    if ( !token || notification.readAt ) return;
    const readAt = new Date().toISOString();
    setItems( ( current ) => current.map( ( item ) =>
      item.recipientId === notification.recipientId ? { ...item, readAt } : item
    ) );
    try {
      await api.markNotificationsRead( token, [ notification.recipientId ] );
      const Notifications = getNotificationsModule();
      if ( Platform.OS !== "web" && Notifications ) {
        await Notifications.setBadgeCountAsync( Math.max( unreadCount - 1, 0 ) );
      }
    } catch ( err ) {
      setItems( ( current ) => current.map( ( item ) =>
        item.recipientId === notification.recipientId
          ? { ...item, readAt: notification.readAt }
          : item
      ) );
      setError( err instanceof Error ? err.message : "Failed to update notification" );
    }
  }, [ token, unreadCount ] );

  const openNotification = useCallback( async ( notification: AppNotification ) => {
    await markRead( notification );
    if ( notification.bookingReference ) {
      router.push( `/ride/${ notification.bookingReference }` );
    }
  }, [ markRead ] );

  const markAllRead = useCallback( async () => {
    if ( !token || unreadCount === 0 ) return;
    const unreadIds = items.filter( ( item ) => !item.readAt ).map( ( item ) => item.recipientId );
    setIsMarkingAllRead( true );
    setError( null );
    try {
      await api.markNotificationsRead( token, unreadIds );
      const readAt = new Date().toISOString();
      setItems( ( current ) => current.map( ( item ) =>
        item.readAt ? item : { ...item, readAt }
      ) );
      const Notifications = getNotificationsModule();
      if ( Platform.OS !== "web" && Notifications ) {
        await Promise.all( [
          Notifications.setBadgeCountAsync( 0 ),
          Notifications.dismissAllNotificationsAsync(),
        ] );
      }
    } catch ( err ) {
      setError( err instanceof Error ? err.message : "Failed to mark notifications read" );
    } finally {
      setIsMarkingAllRead( false );
    }
  }, [ items, token, unreadCount ] );

  const requestPermission = useCallback( async () => {
    if ( Platform.OS === "web" ) return;
    if ( permission === "denied" ) {
      await Linking.openSettings();
      return;
    }
    const Notifications = getNotificationsModule();
    if ( !Notifications ) {
      setPermission( "unavailable" );
      return;
    }
    const result = await Notifications.requestPermissionsAsync( {
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    } );
    const allowed = result.granted
      || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    setPermission( allowed ? "granted" : result.status );
  }, [ permission ] );

  const handleRefresh = async () => {
    setIsRefreshing( true );
    await Promise.all( [ load(), loadPermission() ] );
    setIsRefreshing( false );
  };

  return (
    <ScrollView
      style={ styles.container }
      contentContainerStyle={ [ styles.content, { paddingBottom: insets.bottom + 32 } ] }
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={ isRefreshing }
          onRefresh={ handleRefresh }
          tintColor={ colors.gold }
        />
      }
    >
      <View style={ styles.summary }>
        <View>
          <Text style={ styles.summaryCount }>{ unreadCount }</Text>
          <Text style={ styles.summaryLabel }>
            { unreadCount === 1 ? "unread notification" : "unread notifications" }
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications as read"
          disabled={ unreadCount === 0 || isMarkingAllRead }
          onPress={ markAllRead }
          style={ ( { pressed } ) => [
            styles.markAllButton,
            ( unreadCount === 0 || isMarkingAllRead ) && styles.markAllButtonDisabled,
            pressed && styles.markAllButtonPressed,
          ] }
        >
          { isMarkingAllRead ? (
            <ActivityIndicator color={ colors.gold } size="small" />
          ) : (
            <NativeIcon
              name={ { ios: "checkmark.circle", android: "done_all", web: "done_all" } }
              color={ colors.gold }
              size={ 18 }
            />
          ) }
          <Text style={ styles.markAllText }>Mark all read</Text>
        </Pressable>
      </View>

      { isAdmin && permission !== "granted" && permission !== "unavailable" ? (
        <View style={ styles.permissionBanner }>
          <NativeIcon
            name={ { ios: "bell.slash.fill", android: "notifications_off", web: "notifications_off" } }
            color={ colors.gold }
            size={ 20 }
          />
          <View style={ styles.permissionText }>
            <Text style={ styles.permissionTitle }>Push alerts are off</Text>
            <Text style={ styles.permissionBody }>
              Enable alerts to receive booking and dispatch updates outside the app.
            </Text>
          </View>
          <Pressable onPress={ requestPermission } style={ styles.permissionButton }>
            <Text style={ styles.permissionButtonText }>
              { permission === "denied" ? "Settings" : "Enable" }
            </Text>
          </Pressable>
        </View>
      ) : null }

      <View style={ styles.search }>
        <NativeIcon
          name={ { ios: "magnifyingglass", android: "search", web: "search" } }
          color={ colors.faint }
          size={ 18 }
        />
        <TextInput
          accessibilityLabel="Search notifications"
          value={ query }
          onChangeText={ setQuery }
          placeholder="Search notifications"
          placeholderTextColor={ colors.faint }
          autoCapitalize="none"
          autoCorrect={ false }
          returnKeyType="search"
          style={ styles.searchInput }
        />
        { query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear notification search"
            onPress={ () => setQuery( "" ) }
            hitSlop={ 8 }
          >
            <NativeIcon
              name={ { ios: "xmark.circle.fill", android: "cancel", web: "cancel" } }
              color={ colors.faint }
              size={ 18 }
            />
          </Pressable>
        ) : null }
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={ false }
        contentContainerStyle={ styles.filters }
      >
        { FILTERS.map( ( filter ) => {
          const count = filter.id === "all"
            ? items.length
            : filter.id === "unread"
              ? unreadCount
              : categoryCounts[ filter.id ] ?? 0;
          const selected = activeFilter === filter.id;
          return (
            <Pressable
              key={ filter.id }
              accessibilityRole="button"
              accessibilityState={ { selected } }
              onPress={ () => setActiveFilter( filter.id ) }
              style={ ( { pressed } ) => [
                styles.filter,
                selected && styles.filterSelected,
                pressed && styles.filterPressed,
              ] }
            >
              <Text style={ [ styles.filterLabel, selected && styles.filterLabelSelected ] }>
                { filter.label }
              </Text>
              <Text style={ [ styles.filterCount, selected && styles.filterCountSelected ] }>
                { count }
              </Text>
            </Pressable>
          );
        } ) }
      </ScrollView>

      { error ? <Text style={ styles.error }>{ error }</Text> : null }

      { isLoading ? (
        <View style={ styles.loadingList }>
          { [ 0, 1, 2 ].map( ( item ) => <View key={ item } style={ styles.skeleton } /> ) }
        </View>
      ) : groupedItems.length === 0 ? (
        <View style={ styles.empty }>
          <NativeIcon
            name={ query || activeFilter !== "all"
              ? { ios: "line.3.horizontal.decrease.circle", android: "filter_alt", web: "filter_alt" }
              : { ios: "bell", android: "notifications", web: "notifications" } }
            color={ colors.faint }
            size={ 34 }
          />
          <Text style={ styles.emptyTitle }>
            { query || activeFilter !== "all" ? "No matching notifications" : "No notifications yet" }
          </Text>
          <Text style={ styles.emptyBody }>
            { query || activeFilter !== "all"
              ? "Try another search or choose a different filter."
              : "Booking updates, assignments, and dispatch messages will appear here." }
          </Text>
        </View>
      ) : (
        <View style={ styles.groups }>
          { groupedItems.map( ( group ) => (
            <View key={ group.title } style={ styles.group }>
              <Text style={ [ plate, styles.groupTitle ] }>{ group.title }</Text>
              <View style={ styles.list }>
                { group.items.map( ( item ) => {
                  const meta = categoryMeta( item.category );
                  return (
                    <Pressable
                      key={ item.recipientId }
                      accessibilityRole="button"
                      accessibilityLabel={ `${ item.title }, ${ item.readAt ? "read" : "unread" }` }
                      onPress={ () => openNotification( item ) }
                      style={ ( { pressed } ) => [
                        styles.row,
                        !item.readAt && styles.rowUnread,
                        pressed && styles.rowPressed,
                      ] }
                    >
                      <View style={ [ styles.rowIcon, { backgroundColor: `${ meta.color }18` } ] }>
                        <NativeIcon name={ meta.icon } color={ meta.color } size={ 19 } />
                      </View>
                      <View style={ styles.rowContent }>
                        <View style={ styles.rowHeader }>
                          <Text
                            style={ [ styles.rowTitle, !item.readAt && styles.rowTitleUnread ] }
                            numberOfLines={ 1 }
                          >
                            { item.title }
                          </Text>
                          <Text style={ styles.rowTime }>{ timeAgo( item.createdAt ) }</Text>
                        </View>
                        <Text style={ styles.rowBody } numberOfLines={ 2 }>
                          { item.body }
                        </Text>
                        <View style={ styles.rowMeta }>
                          <Text style={ [ styles.categoryLabel, { color: meta.color } ] }>
                            { meta.label }
                          </Text>
                          { item.bookingReference ? (
                            <>
                              <View style={ styles.metaDot } />
                              <Text style={ [ plate, styles.rowReference ] }>
                                { item.bookingReference }
                              </Text>
                            </>
                          ) : null }
                        </View>
                      </View>
                      { !item.readAt ? <View style={ styles.unreadDot } /> : null }
                    </Pressable>
                  );
                } ) }
              </View>
            </View>
          ) ) }
        </View>
      ) }
    </ScrollView>
  );
}

const styles = StyleSheet.create( {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 18,
  },
  summaryCount: {
    color: colors.ivory,
    fontSize: 32,
    lineHeight: 35,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  markAllButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  markAllButtonDisabled: {
    opacity: 0.42,
  },
  markAllButtonPressed: {
    backgroundColor: colors.raised,
  },
  markAllText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "600",
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 18,
  },
  permissionText: {
    flex: 1,
    gap: 2,
  },
  permissionTitle: {
    color: colors.ivory,
    fontSize: 14,
    fontWeight: "600",
  },
  permissionBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  permissionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: colors.gold,
  },
  permissionButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "700",
  },
  search: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 13,
  },
  searchInput: {
    flex: 1,
    color: colors.ivory,
    fontSize: 14,
    paddingVertical: 0,
  },
  filters: {
    gap: 8,
    paddingVertical: 14,
  },
  filter: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  filterSelected: {
    backgroundColor: colors.ivory,
    borderColor: colors.ivory,
  },
  filterPressed: {
    opacity: 0.78,
  },
  filterLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  filterLabelSelected: {
    color: colors.background,
  },
  filterCount: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "700",
  },
  filterCountSelected: {
    color: colors.background,
    opacity: 0.64,
  },
  error: {
    color: colors.red,
    fontSize: 13,
    marginBottom: 12,
  },
  loadingList: {
    gap: 10,
    paddingTop: 8,
  },
  skeleton: {
    height: 104,
    borderRadius: 14,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingTop: 72,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: colors.ivory,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  groups: {
    gap: 28,
    paddingTop: 8,
  },
  group: {
    gap: 10,
  },
  groupTitle: {
    color: colors.faint,
  },
  list: {
    gap: 2,
  },
  row: {
    minHeight: 104,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  rowUnread: {
    backgroundColor: colors.panel,
  },
  rowPressed: {
    backgroundColor: colors.raised,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  rowContent: {
    flex: 1,
    gap: 5,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowTitle: {
    flex: 1,
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
  },
  rowTitleUnread: {
    color: colors.ivory,
    fontWeight: "600",
  },
  rowTime: {
    color: colors.faint,
    fontSize: 11,
  },
  rowBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 2,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.faint,
  },
  rowReference: {
    color: colors.faint,
    fontSize: 10,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
    marginTop: 7,
  },
} );
