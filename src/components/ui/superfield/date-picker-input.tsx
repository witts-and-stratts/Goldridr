import { AriaAttributes, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { BaseFieldProps } from "./types";
import { cn } from "@/lib/utils";

export interface DatePickerInputProps {
  id?: string;
  name?: string;
  value?: Date | string;
  onChange?: ( value: Date | undefined ) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaConfig?: AriaAttributes;
  dateFormat?: Intl.DateTimeFormatOptions;
  locale?: string;
  minDate?: Date;
  maxDate?: Date;
  onBlur?: () => void;
}

export interface DatePickerFieldProps extends BaseFieldProps, Omit<DatePickerInputProps, keyof BaseFieldProps> {
  type: 'datepicker';
}

const DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" };

const normalizeDate = ( d: Date | string | undefined ): Date | undefined => {
  if ( !d ) return undefined;
  if ( d instanceof Date ) return d;
  if ( typeof d === 'string' ) {
    const parsed = new Date( d );
    return isNaN( parsed.getTime() ) ? undefined : parsed;
  }
  return undefined;
};

function formatDateValue( date: Date | undefined, format: Intl.DateTimeFormatOptions, loc: string ) {
  if ( !date || !( date instanceof Date ) || isNaN( date.getTime() ) ) return "";
  return date.toLocaleDateString( loc, format );
}

function isValidDate( date: Date | undefined ) {
  if ( !date ) return false;
  return !isNaN( date.getTime() );
}

export const DatePickerInput = ( {
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  ariaConfig,
  dateFormat = DEFAULT_DATE_FORMAT,
  locale = "en-US",
  minDate,
  maxDate,
  onBlur,
}: DatePickerInputProps ) => {

  const normalizedValue = normalizeDate( value as Date | string | undefined );

  const [ open, setOpen ] = useState( false );
  const [ month, setMonth ] = useState<Date | undefined>( normalizedValue || new Date() );
  const [ inputValue, setInputValue ] = useState( normalizedValue ? formatDateValue( normalizedValue, dateFormat, locale ) : "" );
  const lastEmittedDateRef = useRef<Date | undefined>( undefined );

  // Sync input value when external value changes
  useEffect( () => {
    const normalized = normalizeDate( value as Date | string | undefined );
    if ( normalized ) {
      queueMicrotask( () => {
        setMonth( normalized );
        const isFromTyping = lastEmittedDateRef.current && lastEmittedDateRef.current.getTime() === normalized.getTime();
        if ( !isFromTyping ) {
          setInputValue( formatDateValue( normalized, dateFormat, locale ) );
        }
      } );
    } else {
      queueMicrotask( () => setInputValue( "" ) );
    }
  }, [ value, dateFormat, locale ] );

  const handleInputChange = ( e: React.ChangeEvent<HTMLInputElement> ) => {
    const newValue = e.target.value;
    setInputValue( newValue );
    const date = new Date( newValue );
    if ( isValidDate( date ) ) {
      lastEmittedDateRef.current = date;
      onChange?.( date );
      setMonth( date );
    }
  };

  const handleBlur = () => {
    if ( normalizedValue ) {
      setInputValue( formatDateValue( normalizedValue, dateFormat, locale ) );
    }
    lastEmittedDateRef.current = undefined;
    onBlur?.();
  };

  const handleKeyDown = ( e: KeyboardEvent<HTMLInputElement> ) => {
    if ( e.key === "ArrowDown" || e.key === "Enter" ) {
      e.preventDefault();
      setOpen( true );
    }
  };

  const handleSelect = ( date: Date | undefined ) => {
    onChange?.( date );
    if ( date ) {
      setInputValue( formatDateValue( date, dateFormat, locale ) );
    }
    setOpen( false );
    lastEmittedDateRef.current = undefined;
  };

  return (
    <InputGroup className={ cn( "h-12", className ) }>
      <InputGroupInput
        id={ id }
        value={ inputValue }
        placeholder={ placeholder || "Select date..." }
        onChange={ handleInputChange }
        onKeyDown={ handleKeyDown }
        onBlur={ handleBlur }
        disabled={ disabled }
        { ...ariaConfig }
      />
      <InputGroupAddon align="inline-end">
        <Popover open={ open } onOpenChange={ setOpen }>
          <PopoverTrigger
            render={
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                aria-label="Select date"
                disabled={ disabled }
                type="button"
              >
                <HugeiconsIcon icon={ Calendar01Icon } strokeWidth={ 2 } />
                <span className="sr-only">Select date</span>
              </InputGroupButton>
            }
          />
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={ -4 }
            sideOffset={ 10 }
          >
            <div
              onClick={ ( e ) => e.stopPropagation() }
              onMouseDown={ ( e ) => e.stopPropagation() }
            >
              <Calendar
                mode='single'
                selected={ normalizedValue }
                month={ month }
                onMonthChange={ setMonth }
                onSelect={ handleSelect }
                captionLayout="dropdown"
                disabled={ ( date ) => {
                  if ( minDate && date < minDate ) return true;
                  if ( maxDate && date > maxDate ) return true;
                  return false;
                } }
              />
            </div>
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
};
