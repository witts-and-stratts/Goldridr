import { AriaAttributes, KeyboardEvent, useEffect, useRef, useState, WheelEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseFieldProps } from "./types";

export interface TagsInputProps {
  id?: string;
  value?: string[];
  onChange?: ( value: string[] ) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaConfig?: AriaAttributes;
  size?: 'default' | 'sm' | 'lg';
  expand?: boolean;
}

export interface TagsFieldProps extends BaseFieldProps, Omit<TagsInputProps, keyof BaseFieldProps> {
  type: 'tags';
}

export const TagsInput = ( { id, value = [], onChange, onBlur, placeholder, disabled, className, ariaConfig, size = 'default', expand = true }: TagsInputProps ) => {
  const [ inputValue, setInputValue ] = useState( "" );
  const inputRef = useRef<HTMLInputElement>( null );
  const containerRef = useRef<HTMLDivElement>( null );

  const handleKeyDown = ( e: KeyboardEvent<HTMLInputElement> ) => {
    if ( ( e.key === 'Enter' || e.key === ',' ) ) {
      e.preventDefault();
      const trimmed = inputValue.trim().replace( /,/g, '' );
      if ( trimmed ) {
        if ( !value?.includes( trimmed ) ) {
          onChange?.( [ ...( value || [] ), trimmed ] );
        }
        setInputValue( "" );
      }
    } else if ( e.key === 'Backspace' && !inputValue && ( value?.length || 0 ) > 0 ) {
      onChange?.( ( value || [] ).slice( 0, -1 ) );
      e.preventDefault();
    }
  };

  const removeKeyword = ( index: number ) => {
    onChange?.( ( value || [] ).filter( ( _, i ) => i !== index ) );
  };

  const handleBlur = () => {
    const trimmed = inputValue.trim().replace( /,/g, '' );
    if ( trimmed ) {
      if ( !value?.includes( trimmed ) ) {
        onChange?.( [ ...( value || [] ), trimmed ] );
      }
      setInputValue( "" );
    }
    onBlur?.();
  };

  const handleWheel = ( e: WheelEvent ) => {
    if ( !expand && containerRef.current ) {
      containerRef.current.scrollLeft += e.deltaY;
    }
  };

  useEffect( () => {
    if ( !expand && containerRef.current ) {
      // Scroll to the end when input changes or tags are added/removed
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [ inputValue, value, expand ] );

  const sizeClasses = {
    sm: "min-h-[32px] text-xs px-2 py-0.5",
    default: "min-h-[36px] text-sm px-2.5 py-1",
    lg: "min-h-[44px] text-base px-3 py-1.5",
  };

  const tagSizeClasses = {
    sm: "px-1.5 py-0 text-[10px]",
    default: "px-2 py-0.5 text-xs",
    lg: "px-2.5 py-1 text-sm",
  };

  const currentSize = sizeClasses[ size ] || sizeClasses.default;
  const currentTagSize = tagSizeClasses[ size ] || tagSizeClasses.default;

  return (
    <div
      ref={ containerRef }
      className={ cn(
        "flex items-center gap-1.5 rounded-md border border-input bg-transparent ring-offset-background cursor-text shadow-xs transition-[color,box-shadow]",
        "focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-ring",
        "aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50",
        expand ? "flex-wrap" : "flex-nowrap overflow-x-auto no-scrollbar scroll-smooth pr-10",
        currentSize,
        className
      ) }
      onClick={ () => inputRef.current?.focus() }
      onWheel={ handleWheel }
      { ...ariaConfig }
    >
      { ( value || [] ).map( ( keyword, i ) => (
        <span key={ i } className={ cn( "inline-flex items-center gap-1 rounded font-normal bg-secondary text-secondary-foreground border border-border/50 shrink-0", currentTagSize ) }>
          { keyword }
          <button
            type="button"
            onClick={ ( e ) => { e.stopPropagation(); removeKeyword( i ); } }
            className="hover:text-foreground text-muted-foreground transition-colors"
            disabled={ disabled }
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ) ) }
      <input
        id={ id }
        ref={ inputRef }
        type="text"
        className="flex-1 bg-transparent border-none outline-none min-w-[80px] placeholder:text-muted-foreground"
        placeholder={ ( value || [] ).length === 0 ? ( placeholder || "Enter tags..." ) : "" }
        value={ inputValue }
        onChange={ ( e ) => setInputValue( e.target.value ) }
        onKeyDown={ handleKeyDown }
        onBlur={ handleBlur }
        disabled={ disabled }
      />
    </div>
  );
};
