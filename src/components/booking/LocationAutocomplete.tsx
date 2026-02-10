"use client";

import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface LocationAutocompleteProps {
  value: string;
  onChange: ( value: string ) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  name: string;
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

export function LocationAutocomplete( {
  value,
  onChange,
  onBlur,
  placeholder = "Enter location",
  className,
  name,
  isInvalid,
}: LocationAutocompleteProps ) {
  const [ inputValue, setInputValue ] = useState( value );
  const [ predictions, setPredictions ] = useState<any[]>( [] );
  const [ isOpen, setIsOpen ] = useState( false );
  const [ highlightedIndex, setHighlightedIndex ] = useState( -1 );

  const inputRef = useRef<HTMLInputElement>( null );
  const containerRef = useRef<HTMLDivElement>( null );
  const sessionToken = useRef<any | null>( null );
  const autocompleteService = useRef<any | null>( null );

  // Sync external value changes
  useEffect( () => {
    setInputValue( value );
  }, [ value ] );

  // Initialize Google Maps Places service
  useEffect( () => {
    let attempts = 0;

    const initService = async () => {
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

  const handlePredictionSelect = ( suggestion: any ) => {
    const text = suggestion.placePrediction?.text?.toString() ||
      suggestion.placePrediction?.mainText?.toString();
    if ( text ) {
      setInputValue( text );
      onChange( text );
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
    <div className="relative" ref={ containerRef }>
      <Input
        ref={ inputRef }
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
                  key={ index }
                  onClick={ () => handlePredictionSelect( suggestion ) }
                  className={ `cursor-pointer px-4 py-2 text-sm transition-colors ${ index === highlightedIndex
                    ? "bg-white/20 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }` }
                  onMouseEnter={ () => setHighlightedIndex( index ) }
                >
                  { suggestion.placePrediction?.text?.toString() }
                </li>
              ) ) }
            </ul>
          </motion.div>
        ) }
      </AnimatePresence>
    </div>
  );
}
