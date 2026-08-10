"use client";

import { Input } from "@/components/ui/input";
import { InputGroupInput } from "@/components/ui/input-group";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface LocationInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: ( value: string ) => void;
  onLocationSelect?: ( location: SelectedPlace ) => void;
  isInvalid?: boolean;
  inInputGroup?: boolean;
}

interface SelectedPlace {
  fetchFields( options: { fields: string[]; } ): Promise<void>;
  displayName?: string;
  formattedAddress?: string;
  location?: unknown;
}

interface PlaceSuggestion {
  description?: string;
  place_id?: string;
  placePrediction?: {
    text?: { toString(): string; };
    toPlace(): SelectedPlace;
  };
}

interface AutocompleteService {
  fetchAutocompleteSuggestions( request: {
    input: string;
    sessionToken: unknown;
    locationRestriction: unknown;
  } ): Promise<{ suggestions?: PlaceSuggestion[]; }>;
}

interface PlacesLibrary {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: AutocompleteService;
}

interface GoogleMapsApi {
  importLibrary( library: "places" ): Promise<unknown>;
  LatLng: new ( latitude: number, longitude: number ) => unknown;
  LatLngBounds: new ( southwest: unknown, northeast: unknown ) => unknown;
}

type GoogleWindow = Window & {
  google?: { maps?: GoogleMapsApi; };
};

// Texas bounds for location restriction
const TEXAS_BOUNDS = {
  south: 25.837377,
  west: -106.645646,
  north: 36.500704,
  east: -93.508292,
};

export const LocationInput = forwardRef<HTMLInputElement, LocationInputProps>( ( {
  value,
  onChange,
  onBlur,
  placeholder = "Enter location",
  className,
  name,
  isInvalid,
  onLocationSelect,
  inInputGroup = false,
  ...props
}, ref ) => {
  const [ inputValue, setInputValue ] = useState( value || "" );
  const [ predictions, setPredictions ] = useState<PlaceSuggestion[]>( [] );
  const [ isOpen, setIsOpen ] = useState( false );
  const [ highlightedIndex, setHighlightedIndex ] = useState( -1 );

  const innerInputRef = useRef<HTMLInputElement>( null );
  const containerRef = useRef<HTMLDivElement>( null );
  const sessionToken = useRef<unknown>( null );
  const autocompleteService = useRef<AutocompleteService | null>( null );
  const pendingInput = useRef( "" );
  const latestRequest = useRef( 0 );

  // Sync external value changes
  useEffect( () => {
    setInputValue( value || "" );
  }, [ value ] );

  const requestSuggestions = useCallback( async ( val: string ) => {
    const service = autocompleteService.current;
    const maps = ( window as GoogleWindow ).google?.maps;
    if ( !service || !maps ) return;

    const requestId = ++latestRequest.current;

    try {
      const texasBounds = new maps.LatLngBounds(
        new maps.LatLng( TEXAS_BOUNDS.south, TEXAS_BOUNDS.west ),
        new maps.LatLng( TEXAS_BOUNDS.north, TEXAS_BOUNDS.east )
      );

      const { suggestions } = await service.fetchAutocompleteSuggestions( {
        input: val,
        sessionToken: sessionToken.current,
        locationRestriction: texasBounds,
      } );

      if ( requestId !== latestRequest.current || pendingInput.current !== val ) return;

      if ( suggestions?.length ) {
        setPredictions( suggestions );
        setIsOpen( true );
      } else {
        setPredictions( [] );
        setIsOpen( false );
      }
    } catch ( error ) {
      if ( requestId !== latestRequest.current ) return;
      console.error( "Error fetching suggestions", error );
      setPredictions( [] );
      setIsOpen( false );
    }
  }, [] );

  // Google installs the namespace before importLibrary is ready, so wait for the
  // actual function instead of treating the partial namespace as a loaded API.
  useEffect( () => {
    let cancelled = false;
    const startedAt = Date.now();

    const initService = async () => {
      const maps = ( window as GoogleWindow ).google?.maps;
      if ( !maps?.importLibrary ) {
        if ( !cancelled && Date.now() - startedAt < 10000 ) {
          window.setTimeout( initService, 100 );
        }
        return;
      }

      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } =
          await maps.importLibrary( "places" ) as PlacesLibrary;

        if ( cancelled ) return;

        sessionToken.current = new AutocompleteSessionToken();
        autocompleteService.current = AutocompleteSuggestion;
        if ( pendingInput.current ) void requestSuggestions( pendingInput.current );
      } catch ( error ) {
        console.error( "Error loading Google Maps Places Library", error );
      }
    };

    void initService();
    return () => {
      cancelled = true;
    };
  }, [ requestSuggestions ] );

  // Handle outside click to close dropdown
  useEffect( () => {
    const handleClickOutside = ( event: MouseEvent ) => {
      if ( containerRef.current && !containerRef.current.contains( event.target as Node ) ) {
        setIsOpen( false );
      }
    };

    document.addEventListener( "mousedown", handleClickOutside );
    return () => document.removeEventListener( "mousedown", handleClickOutside );
  }, [] );

  const handleInputChange = async ( e: React.ChangeEvent<HTMLInputElement> ) => {
    const val = e.target.value;
    pendingInput.current = val;
    setInputValue( val );
    onChange( val );

    if ( !val ) {
      latestRequest.current += 1;
      setPredictions( [] );
      setIsOpen( false );
      return;
    }

    if ( autocompleteService.current ) void requestSuggestions( val );
  };

  const handlePredictionSelect = async ( suggestion: PlaceSuggestion ) => {
    const text = suggestion.description || suggestion.placePrediction?.text?.toString();

    if ( text ) {
      setInputValue( text );
      onChange( text );

      if ( onLocationSelect && suggestion.placePrediction ) {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields( { fields: [ "displayName", "formattedAddress", "location" ] } );
        onLocationSelect( place );
      }
    }
    setIsOpen( false );
    setHighlightedIndex( -1 );
  };

  const handleKeyDown = ( e: React.KeyboardEvent<HTMLInputElement> ) => {
    if ( !isOpen || predictions.length === 0 ) return;

    switch ( e.key ) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex( ( prev ) => ( prev < predictions.length - 1 ? prev + 1 : 0 ) );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex( ( prev ) => ( prev > 0 ? prev - 1 : predictions.length - 1 ) );
        break;
      case "Enter":
        e.preventDefault();
        if ( highlightedIndex >= 0 && highlightedIndex < predictions.length ) {
          handlePredictionSelect( predictions[ highlightedIndex ] );
        }
        break;
      case "Escape":
        setIsOpen( false );
        setHighlightedIndex( -1 );
        break;
    }
  };

  const Control = inInputGroup ? InputGroupInput : Input;

  return (
    <div className={ cn( "relative w-full", inInputGroup && "min-w-0 flex-1" ) } ref={ containerRef }>
      <Control
        ref={ ref || innerInputRef }
        id={ name }
        name={ name }
        value={ inputValue }
        onBlur={ onBlur }
        onChange={ handleInputChange }
        onKeyDown={ handleKeyDown }
        placeholder={ placeholder }
        className={ className }
        aria-invalid={ isInvalid }
        autoComplete="off"
        { ...props }
      />

      <AnimatePresence>
        { isOpen && predictions.length > 0 && (
          <motion.div
            initial={ { opacity: 0, y: -10 } }
            animate={ { opacity: 1, y: 0 } }
            exit={ { opacity: 0, y: -10 } }
            className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            <ul className="py-1">
              { predictions.map( ( suggestion, index ) => (
                <li
                  key={ suggestion.place_id || index }
                  onClick={ () => handlePredictionSelect( suggestion ) }
                  className={ cn(
                    "cursor-pointer px-3 py-2 text-sm outline-none transition-colors",
                    index === highlightedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                  ) }
                  onMouseEnter={ () => setHighlightedIndex( index ) }
                >
                  { suggestion.description || suggestion.placePrediction?.text?.toString() }
                </li>
              ) ) }
            </ul>
          </motion.div>
        ) }
      </AnimatePresence>
    </div>
  );
} );

LocationInput.displayName = "LocationInput";
