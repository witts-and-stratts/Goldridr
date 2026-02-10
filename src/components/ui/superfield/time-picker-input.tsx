"use client";

import { useEffect, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { BaseFieldProps } from "./types";

export interface TimePickerInputProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: ( value: string ) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
}

export interface TimePickerFieldProps extends BaseFieldProps {
  type: 'timepicker';
  id?: string;
  name?: string;
  value?: string;
  onChange?: ( e: React.ChangeEvent<HTMLInputElement> ) => void;
  placeholder?: string;
  onBlur?: () => void;
}

// Generate hours 01-12
const hours = Array.from( { length: 12 }, ( _, i ) => {
  const hour = i + 1;
  return hour.toString().padStart( 2, '0' );
} );

// Generate minutes 00-55 in 5-minute intervals
const minutes = Array.from( { length: 12 }, ( _, i ) => {
  const minute = i * 5;
  return minute.toString().padStart( 2, '0' );
} );

const periods = [ 'AM', 'PM' ];

// Convert 24-hour format to 12-hour format
function parse24HourTime( time: string ): { hour: string; minute: string; period: string; } {
  if ( !time || !time.match( /^\d{2}:\d{2}$/ ) ) {
    return { hour: '12', minute: '00', period: 'AM' };
  }

  const [ hourStr, minuteStr ] = time.split( ':' );
  let hour = parseInt( hourStr, 10 );
  const minute = minuteStr;
  const period = hour >= 12 ? 'PM' : 'AM';

  if ( hour === 0 ) hour = 12;
  else if ( hour > 12 ) hour -= 12;

  return { hour: hour.toString().padStart( 2, '0' ), minute, period };
}

// Convert 12-hour format to 24-hour format
function format24HourTime( hour: string, minute: string, period: string ): string {
  let hour24 = parseInt( hour, 10 );

  if ( period === 'AM' && hour24 === 12 ) {
    hour24 = 0;
  } else if ( period === 'PM' && hour24 !== 12 ) {
    hour24 += 12;
  }

  return `${ hour24.toString().padStart( 2, '0' ) }:${ minute }`;
}

export const TimePickerInput = ( {
  id,
  value,
  onChange,
  disabled,
  className,
  onBlur,
}: TimePickerInputProps ) => {
  const parsed = parse24HourTime( value || '' );
  const [ hour, setHour ] = useState( parsed.hour );
  const [ minute, setMinute ] = useState( parsed.minute );
  const [ period, setPeriod ] = useState( parsed.period );
  const [ isOpen, setIsOpen ] = useState( false );

  // Update internal state when external value changes
  useEffect( () => {
    const parsed = parse24HourTime( value || '' );
    setHour( parsed.hour );
    setMinute( parsed.minute );
    setPeriod( parsed.period );
  }, [ value ] );

  const handleChange = ( newHour: string, newMinute: string, newPeriod: string ) => {
    const time24 = format24HourTime( newHour, newMinute, newPeriod );
    onChange?.( time24 );
  };

  // Format display value
  const displayValue = value ? `${ hour }:${ minute } ${ period }` : '';

  return (
    <Popover open={ isOpen } onOpenChange={ setIsOpen }>
      <PopoverTrigger
        render={
          <div className={ cn( "w-full cursor-pointer", disabled && "cursor-not-allowed opacity-50" ) }>
            <InputGroup className={ cn( "h-12", className ) }>
              <InputGroupInput
                id={ id }
                value={ displayValue }
                placeholder="Select time..."
                readOnly
                disabled={ disabled }
                onBlur={ onBlur }
                className="pointer-events-none"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Select time"
                  disabled={ disabled }
                  type="button"
                  className="pointer-events-none"
                >
                  <HugeiconsIcon icon={ Clock01Icon } strokeWidth={ 2 } />
                  <span className="sr-only">Select time</span>
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        }
      />
      <PopoverContent
        className="w-(--anchor-width) p-4"
        align="end"
        alignOffset={ 0 }
        sideOffset={ 4 }
      >
        <div
          onClick={ ( e ) => e.stopPropagation() }
          onMouseDown={ ( e ) => e.stopPropagation() }
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Hour</label>
              <Select
                value={ hour }
                onValueChange={ ( val ) => {
                  if ( val ) {
                    setHour( val );
                    handleChange( val, minute, period );
                  }
                } }
                disabled={ disabled }
              >
                <SelectTrigger className="w-full p-1.5 h-8">
                  <SelectValue placeholder="HH" className="text-xs" />
                </SelectTrigger>
                <SelectContent>
                  { hours.map( ( h ) => (
                    <SelectItem key={ h } value={ h } className="text-xs">
                      { h }
                    </SelectItem>
                  ) ) }
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Minute</label>
              <Select
                value={ minute }
                onValueChange={ ( val ) => {
                  if ( val ) {
                    setMinute( val );
                    handleChange( hour, val, period );
                  }
                } }
                disabled={ disabled }
              >
                <SelectTrigger className="w-full p-1.5 h-8">
                  <SelectValue placeholder="MM" className="text-xs" />
                </SelectTrigger>
                <SelectContent>
                  { minutes.map( ( m ) => (
                    <SelectItem key={ m } value={ m } className="text-xs">
                      { m }
                    </SelectItem>
                  ) ) }
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Period</label>
              <Select
                value={ period }
                onValueChange={ ( val ) => {
                  if ( val ) {
                    setPeriod( val );
                    handleChange( hour, minute, val );
                  }
                } }
                disabled={ disabled }
              >
                <SelectTrigger className="w-full p-1.5 h-8">
                  <SelectValue placeholder="AM" className="text-xs" />
                </SelectTrigger>
                <SelectContent>
                  { periods.map( ( p ) => (
                    <SelectItem key={ p } value={ p } className="text-xs">
                      { p }
                    </SelectItem>
                  ) ) }
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};


