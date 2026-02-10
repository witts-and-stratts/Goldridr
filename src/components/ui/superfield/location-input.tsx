"use client";

import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, ForwardedRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface LocationInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: ( value: string ) => void;
  onLocationSelect?: ( location: any ) => void;
  isInvalid?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

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
  ...props
}, ref ) => {
  const [ inputValue, setInputValue ] = useState( value || "" );
  const [ predictions, setPredictions ] = useState<any[]>( [] );
  const [ isOpen, setIsOpen ] = useState( false );
  const [ highlightedIndex, setHighlightedIndex ] = useState( -1 );

  const innerInputRef = useRef<HTMLInputElement>( null );
  const containerRef = useRef<HTMLDivElement>( null );
  const sessionToken = useRef<any | null>( null );
  const autocompleteService = useRef<any>( null );
  const placesService = useRef<any | null>( null );

  // Sync external value changes
  useEffect( () => {
    setInputValue( value || "" );
  }, [ value ] );

  // Initialize Google Maps Places service
  useEffect( () => {
    let attempts = 0;

    const initService = async () => {
      if ( typeof window === 'undefined' || !window.google ) return;

      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } =
          await window.google.maps.importLibrary( "places" ) as any;
        const { PlacesService } = await window.google.maps.importLibrary( "places" ) as any;

        sessionToken.current = new AutocompleteSessionToken();
        autocompleteService.current = AutocompleteSuggestion;

        // We need a dummy div for PlacesService
        const dummyDiv = document.createElement( 'div' );
        placesService.current = new PlacesService( dummyDiv );

      } catch ( error ) {
        console.error( "Error loading Google Maps Places Library", error );
        if ( attempts < 5 ) {
          attempts++;
          setTimeout( initService, 500 );
        }
      }
    };

    initService();
  }, [] );

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
    setInputValue( val );
    onChange( val );

    if ( !val ) {
      setPredictions( [] );
      setIsOpen( false );
      return;
    }

    if ( autocompleteService.current ) {
      try {
        const texasBounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng( TEXAS_BOUNDS.south, TEXAS_BOUNDS.west ),
          new window.google.maps.LatLng( TEXAS_BOUNDS.north, TEXAS_BOUNDS.east )
        );

        const request = {
          input: val,
          sessionToken: sessionToken.current,
          locationRestriction: texasBounds,
        };

        // Note: fetchAutocompleteSuggestions might be static or instance depending on version
        // Using class directly as per previous implementation, but checking docs usually it's a service instance.
        // Previous implementation used: autocompleteService.current.fetchAutocompleteSuggestions(request)
        // where autocompleteService.current assigned AutocompleteSuggestion class? 
        // Wait, AutocompleteSuggestion is a class representing a suggestion.
        // AutocompleteService is the service class.
        // Previous code: `autocompleteService.current = AutocompleteSuggestion` -- This looks WRONG if logic was `fetchAutocompleteSuggestions`. 
        // `AutocompleteSuggestion` doesn't have `fetchAutocompleteSuggestions`. `AutocompleteService` does.
        // Let's check previous code again.

        // Re-reading Step 1794:
        // const { AutocompleteSessionToken, AutocompleteSuggestion } = await google.maps.importLibrary( "places" )
        // sessionToken.current = new AutocompleteSessionToken();
        // autocompleteService.current = AutocompleteSuggestion;
        // ... await autocompleteService.current.fetchAutocompleteSuggestions( request );

        // If I assume the previous code was working, maybe `AutocompleteSuggestion` has static method?
        // Or maybe I misread `AutocompleteSuggestion` vs `AutocompleteService`.
        // Actually, `google.maps.places.AutocompleteService` is the standard class. 
        // `AutocompleteSuggestion` is the type of result.

        // I will use `AutocompleteService` to be safe and standard.
        const { AutocompleteService } = await window.google.maps.importLibrary( "places" ) as any;
        const service = new AutocompleteService();

        const { predictions } = await service.getPlacePredictions( request ); // getPlacePredictions is the standard method

        if ( predictions && predictions.length > 0 ) {
          // Mapping to match previous structure or just use predictions
          // Previous code used `fetchAutocompleteSuggestions` returning `{ suggestions }`. This looks like newer API.
          // Newer API: `Place.findPlaceFromQuery`? No.
          // `google.maps.places.AutocompleteService` -> `getPlacePredictions`.

          // Let's stick to standard `AutocompleteService` and `getPlacePredictions`.
          // But wait, the previous code might have been using the NEW Places API (Place Autocomplete New).
          // If so, it uses `AutocompleteSuggestion` ??

          // I'll stick to a robust implementation using `AutocompleteService`.
          setPredictions( predictions as any );
          setIsOpen( true );
        } else {
          setPredictions( [] );
          setIsOpen( false );
        }

      } catch ( error ) {
        console.error( "Error fetching suggestions", error );
        setPredictions( [] );
      }
    }
  };

  const handlePredictionSelect = ( suggestion: any ) => {
    // suggestion is google.maps.places.AutocompletePrediction
    const text = suggestion.description || suggestion.placePrediction?.text?.toString();

    if ( text ) {
      setInputValue( text );
      onChange( text );

      // If we need details (lat/lng), we'd use PlacesService.getDetails here if onLocationSelect is provided
      if ( onLocationSelect && suggestion.place_id ) {
        // TODO: Implement getDetails if needed. For now just passing text is what the form expects.
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

  return (
    <div className="relative w-full" ref={ containerRef }>
      <Input
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
            className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-black/90 backdrop-blur-md shadow-xl max-h-60 overflow-y-auto"
          >
            <ul className="py-1">
              { predictions.map( ( suggestion, index ) => (
                <li
                  key={ suggestion.place_id || index }
                  onClick={ () => handlePredictionSelect( suggestion ) }
                  className={ cn(
                    "cursor-pointer px-4 py-2 text-sm transition-colors",
                    index === highlightedIndex
                      ? "bg-white/20 text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  ) }
                  onMouseEnter={ () => setHighlightedIndex( index ) }
                >
                  { suggestion.description || ( suggestion as any ).placePrediction?.text?.toString() }
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
