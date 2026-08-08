"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";

interface InteractiveRouteMapProps {
  pickupLocation: string;
  dropoffLocation?: string;
  expanded?: boolean;
  className?: string;
}

const HOUSTON_CENTER = { lat: 29.7604, lng: -95.3698 };
const ENDPOINT_PIN_PATH = "M0 0C-4.42 0-8 3.58-8 8c0 6 8 14 8 14s8-8 8-14c0-4.42-3.58-8-8-8Z";

interface MapInstance {
  fitBounds: ( bounds: unknown ) => void;
  panTo?: ( position: unknown ) => void;
  setCenter: ( position: unknown ) => void;
  setZoom: ( zoom: number ) => void;
}

interface MapOverlayInstance {
  setMap: ( map: MapInstance | null ) => void;
  set?: ( key: string, value: string ) => void;
}

interface GeocodeResult {
  geometry?: { location?: unknown; };
}

interface GoogleMapsApi {
  LatLngBounds: new () => { extend: ( position: unknown ) => void; };
  event?: { clearInstanceListeners: ( instance: MapInstance ) => void; };
  importLibrary: ( library: string ) => Promise<Record<string, unknown>>;
}

type MapConstructor = new ( container: HTMLElement, options: Record<string, unknown> ) => MapInstance;
type RouteInstance = {
  path?: unknown[];
  createPolylines: ( options?: Record<string, unknown> ) => MapOverlayInstance[];
};
type RouteConstructor = {
  computeRoutes: ( request: Record<string, unknown> ) => Promise<{ routes?: RouteInstance[]; }>;
};
interface OverlayViewInstance extends MapOverlayInstance {
  draw(): void;
  getPanes(): { overlayMouseTarget?: HTMLElement; } | null;
  getProjection(): {
    fromLatLngToDivPixel: ( position: unknown ) => { x: number; y: number; } | null;
  };
  onAdd(): void;
  onRemove(): void;
}
type OverlayViewConstructor = new () => OverlayViewInstance;
type GeocoderConstructor = new () => {
  geocode: (
    request: { address: string; },
    callback: ( results: GeocodeResult[] | null, status: string ) => void
  ) => void;
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [ { color: "#101010" } ] },
  { elementType: "labels.text.fill", stylers: [ { color: "#77736b" } ] },
  { elementType: "labels.text.stroke", stylers: [ { color: "#0a0a0a" } ] },
  { featureType: "administrative", elementType: "geometry", stylers: [ { color: "#2b2b2b" } ] },
  { featureType: "poi", elementType: "labels", stylers: [ { visibility: "off" } ] },
  { featureType: "road", elementType: "geometry", stylers: [ { color: "#242424" } ] },
  { featureType: "road.highway", elementType: "geometry", stylers: [ { color: "#3a3121" } ] },
  { featureType: "transit", stylers: [ { visibility: "off" } ] },
  { featureType: "water", elementType: "geometry", stylers: [ { color: "#070809" } ] },
];

function waitForGoogleMaps(): Promise<GoogleMapsApi> {
  return new Promise( ( resolve, reject ) => {
    const startedAt = Date.now();
    const check = () => {
      const maps = ( window as unknown as { google?: { maps?: GoogleMapsApi; }; } ).google?.maps;
      if ( maps?.importLibrary ) {
        resolve( maps );
        return;
      }

      if ( Date.now() - startedAt > 10000 ) {
        reject( new Error( "Google Maps did not load" ) );
        return;
      }

      window.setTimeout( check, 100 );
    };

    check();
  } );
}

export function InteractiveRouteMap( {
  pickupLocation,
  dropoffLocation,
  expanded = false,
  className = "",
}: InteractiveRouteMapProps ) {
  const containerRef = useRef<HTMLDivElement>( null );
  const mapRef = useRef<MapInstance | null>( null );
  const mapsApiRef = useRef<GoogleMapsApi | null>( null );
  const routeConstructorRef = useRef<RouteConstructor | null>( null );
  const geocoderConstructorRef = useRef<GeocoderConstructor | null>( null );
  const overlayViewConstructorRef = useRef<OverlayViewConstructor | null>( null );
  const routePolylinesRef = useRef<MapOverlayInstance[]>( [] );
  const endpointMarkersRef = useRef<MapOverlayInstance[]>( [] );
  const routeRequestRef = useRef( 0 );
  const [ status, setStatus ] = useState<"loading" | "ready" | "error">( "loading" );
  const [ mapRevision, setMapRevision ] = useState( 0 );
  const [ mapRetryCount, setMapRetryCount ] = useState( 0 );
  const [ routeRetryCount, setRouteRetryCount ] = useState( 0 );

  useEffect( () => {
    let cancelled = false;
    let map: MapInstance | null = null;

    const initialise = async () => {
      setStatus( "loading" );

      try {
        const maps = await waitForGoogleMaps();
        const [ mapsLibrary, routesLibrary, geocodingLibrary ] = await Promise.all( [
          maps.importLibrary( "maps" ),
          maps.importLibrary( "routes" ),
          maps.importLibrary( "geocoding" ),
        ] );
        const Map = mapsLibrary.Map as MapConstructor;
        const OverlayView = mapsLibrary.OverlayView as OverlayViewConstructor;
        const Route = routesLibrary.Route as RouteConstructor;
        const Geocoder = geocodingLibrary.Geocoder as GeocoderConstructor;

        if ( cancelled || !containerRef.current ) return;

        map = new Map( containerRef.current, {
          center: HOUSTON_CENTER,
          zoom: 9,
          styles: DARK_MAP_STYLE,
          backgroundColor: "#0a0a0a",
          clickableIcons: false,
          disableDefaultUI: false,
          fullscreenControl: expanded,
          gestureHandling: expanded ? "greedy" : "cooperative",
          mapTypeControl: false,
          rotateControl: false,
          scaleControl: expanded,
          streetViewControl: false,
          zoomControl: true,
        } );
        mapRef.current = map;
        mapsApiRef.current = maps;
        routeConstructorRef.current = Route;
        geocoderConstructorRef.current = Geocoder;
        overlayViewConstructorRef.current = OverlayView;
        setStatus( "ready" );
        setMapRevision( revision => revision + 1 );
      } catch ( error ) {
        if ( !cancelled ) {
          console.error( "Failed to initialise interactive route map", error );
          setStatus( "error" );
        }
      }
    };

    void initialise();

    return () => {
      cancelled = true;
      routeRequestRef.current += 1;
      routePolylinesRef.current.forEach( polyline => polyline.setMap( null ) );
      endpointMarkersRef.current.forEach( marker => marker.setMap( null ) );
      routePolylinesRef.current = [];
      endpointMarkersRef.current = [];
      const maps = ( window as unknown as { google?: { maps?: GoogleMapsApi; }; } ).google?.maps;
      if ( map && maps?.event ) maps.event.clearInstanceListeners( map );
      if ( mapRef.current === map ) {
        mapRef.current = null;
        mapsApiRef.current = null;
        routeConstructorRef.current = null;
        geocoderConstructorRef.current = null;
        overlayViewConstructorRef.current = null;
      }
    };
  }, [ expanded, mapRetryCount ] );

  useEffect( () => {
    const map = mapRef.current;
    const maps = mapsApiRef.current;
    const Route = routeConstructorRef.current;
    const Geocoder = geocoderConstructorRef.current;
    const OverlayView = overlayViewConstructorRef.current;
    if ( !map || !maps || !Route || !Geocoder || !OverlayView ) return;

    const requestId = ++routeRequestRef.current;
    const pickup = pickupLocation.trim();
    const dropoff = dropoffLocation?.trim() || "";

    const clearCurrentOverlays = () => {
      routePolylinesRef.current.forEach( polyline => polyline.setMap( null ) );
      endpointMarkersRef.current.forEach( marker => marker.setMap( null ) );
      routePolylinesRef.current = [];
      endpointMarkersRef.current = [];
    };

    const createEndpoint = ( position: unknown, label: string, filled: boolean ) => {
      class EndpointOverlay extends OverlayView {
        private readonly element: HTMLDivElement;

        constructor() {
          super();
          this.element = document.createElement( "div" );
          this.element.setAttribute( "role", "img" );
          this.element.setAttribute( "aria-label", label );
          this.element.title = label;
          this.element.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:10;";
          this.element.innerHTML = `<svg aria-hidden="true" width="${ expanded ? 36 : 32 }" height="${ expanded ? 44 : 40 }" viewBox="-10 -2 20 26"><path d="${ ENDPOINT_PIN_PATH }" fill="${ filled ? "#D4AF37" : "#0a0a0a" }" stroke="#D4AF37" stroke-width="1.5"/><text x="0" y="11" text-anchor="middle" fill="${ filled ? "#0a0a0a" : "#D4AF37" }" font-family="Inter, sans-serif" font-size="8" font-weight="700">${ filled ? "A" : "B" }</text></svg>`;
        }

        onAdd() {
          this.getPanes()?.overlayMouseTarget?.appendChild( this.element );
        }

        draw() {
          const point = this.getProjection().fromLatLngToDivPixel( position );
          if ( !point ) return;
          this.element.style.transform = `translate(${ point.x }px, ${ point.y }px) translate(-50%, -100%)`;
        }

        onRemove() {
          this.element.remove();
        }
      }

      const endpoint = new EndpointOverlay();
      endpoint.setMap( map );
      return endpoint;
    };

    const updateRoute = async () => {
      setStatus( "ready" );

      if ( pickup.length < 5 ) {
        clearCurrentOverlays();
        if ( map.panTo ) map.panTo( HOUSTON_CENTER );
        else map.setCenter( HOUSTON_CENTER );
        map.setZoom( 9 );
        return;
      }

      if ( !dropoff ) {
        const geocoder = new Geocoder();
        geocoder.geocode( { address: pickup }, ( results, geocodeStatus ) => {
          if ( requestId !== routeRequestRef.current ) return;
          const location = results?.[ 0 ]?.geometry?.location;

          if ( geocodeStatus !== "OK" || !location ) {
            setStatus( "error" );
            return;
          }

          const marker = createEndpoint( location, "Pickup", true );
          clearCurrentOverlays();
          endpointMarkersRef.current = [ marker ];
          if ( map.panTo ) map.panTo( location );
          else map.setCenter( location );
          map.setZoom( 13 );
          setStatus( "ready" );
        } );
        return;
      }

      try {
        const { routes } = await Route.computeRoutes( {
          origin: pickup,
          destination: dropoff,
          travelMode: "DRIVING",
          fields: [ "path" ],
        } );

        if ( requestId !== routeRequestRef.current ) return;

        const route = routes?.[ 0 ];
        if ( !route?.path?.length ) {
          setStatus( "error" );
          return;
        }

        const nextPolylines = route.createPolylines( {
          polylineOptions: {
            strokeColor: "#D4AF37",
            strokeOpacity: 1,
            strokeWeight: expanded ? 6 : 5,
          },
        } );
        const nextMarkers: MapOverlayInstance[] = [];
        const start = route.path[ 0 ];
        const end = route.path[ route.path.length - 1 ];
        if ( start ) nextMarkers.push( createEndpoint( start, "Pickup", true ) );
        if ( end ) nextMarkers.push( createEndpoint( end, "Drop-off", false ) );

        clearCurrentOverlays();
        nextPolylines.forEach( polyline => polyline.setMap( map ) );
        routePolylinesRef.current = nextPolylines;
        endpointMarkersRef.current = nextMarkers;
        const bounds = new maps.LatLngBounds();
        route.path.forEach( position => bounds.extend( position ) );
        map.fitBounds( bounds );
        setStatus( "ready" );
      } catch ( error ) {
        if ( requestId === routeRequestRef.current ) {
          console.error( "Failed to update interactive route map", error );
          setStatus( "error" );
        }
      }
    };

    const timeout = window.setTimeout( () => void updateRoute(), 300 );
    return () => {
      window.clearTimeout( timeout );
      if ( requestId === routeRequestRef.current ) routeRequestRef.current += 1;
    };
  }, [ pickupLocation, dropoffLocation, expanded, mapRevision, routeRetryCount ] );

  return (
    <div className={ className } aria-busy={ status === "loading" }>
      <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
        <div ref={ containerRef } className="absolute inset-0" aria-label="Interactive route map" />

        { status === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35" aria-label="Loading route map">
            <Loader2 className="size-6 animate-spin text-gold" />
          </div>
        ) }

        { status === "error" && (
          <div className="absolute inset-x-4 top-4 flex items-center gap-3 border border-white/10 bg-black/90 px-3 py-2 text-xs text-white/70">
            <AlertCircle className="size-4 shrink-0 text-gold" />
            <span className="min-w-0 flex-1">We couldn&apos;t draw this route. Check the addresses and try again.</span>
            <button
              type="button"
              onClick={ () => {
                if ( mapRef.current ) setRouteRetryCount( count => count + 1 );
                else setMapRetryCount( count => count + 1 );
              } }
              className="flex shrink-0 items-center gap-1.5 border border-gold/50 px-2 py-1 font-wide uppercase tracking-wider text-gold transition-colors hover:bg-gold hover:text-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
            >
              <RotateCcw className="size-3" />
              Retry
            </button>
          </div>
        ) }
      </div>
    </div>
  );
}
