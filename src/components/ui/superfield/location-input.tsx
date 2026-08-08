"use client";

import { Input } from "@/components/ui/input";
import { InputGroupInput } from "@/components/ui/input-group";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, ForwardedRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface LocationInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: ( value: string ) => void;
  onLocationSelect?: ( location: any ) => void;
  isInvalid?: boolean;
  inInputGroup?: boolean;
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
  inInputGroup = false,
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

        sessionToken.current = new AutocompleteSessionToken();
        autocompleteService.current = AutocompleteSuggestion;

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

        const { suggestions } = await autocompleteService.current.fetchAutocompleteSuggestions( request );

        if ( suggestions && suggestions.length > 0 ) {
          setPredictions( suggestions );
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

  const handlePredictionSelect = async ( suggestion: any ) => {
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
