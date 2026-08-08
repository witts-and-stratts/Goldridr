"use client";

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
import { BaseFieldProps } from "./base-types";

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

const quickTimes = [
  { label: "8:00 AM", value: "08:00" },
  { label: "9:00 AM", value: "09:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "2:00 PM", value: "14:00" },
  { label: "5:00 PM", value: "17:00" },
];

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
  name,
  value,
  onChange,
  disabled,
  className,
  onBlur,
}: TimePickerInputProps ) => {
  const parsed = parse24HourTime( value || '' );
  const { hour, minute, period } = parsed;

  const handleChange = ( newHour: string, newMinute: string, newPeriod: string ) => {
    const time24 = format24HourTime( newHour, newMinute, newPeriod );
    onChange?.( time24 );
  };

  const selectTime = ( time: string ) => {
    onChange?.( time );
  };

  // Format display value
  const displayValue = value ? `${ hour }:${ minute } ${ period }` : '';

  return (
    <Popover>
      <PopoverTrigger
        nativeButton={ false }
        render={
          <div className={ cn( "w-full cursor-pointer", disabled && "cursor-not-allowed opacity-50" ) }>
            <InputGroup className={ className }>
              <InputGroupInput
                id={ id }
                name={ name }
                value={ displayValue }
                placeholder="Choose pickup time"
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
        className="vega-form dark w-[22rem] max-w-[calc(100vw-2rem)] p-0"
        align="end"
        alignOffset={ 0 }
        sideOffset={ 4 }
      >
        <div
          onClick={ ( e ) => e.stopPropagation() }
          onMouseDown={ ( e ) => e.stopPropagation() }
          className="flex flex-col"
        >
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium text-foreground">Pickup time</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose a common time or set one precisely.</p>
          </div>

          <div className="px-4 pb-4 pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Popular times</p>
            <div className="grid grid-cols-3 gap-1.5">
              { quickTimes.map( ( option ) => (
                <button
                  key={ option.value }
                  type="button"
                  disabled={ disabled }
                  aria-pressed={ value === option.value }
                  onClick={ () => selectTime( option.value ) }
                  className={ cn(
                    "h-9 rounded-md border px-2 text-xs font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                    value === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  ) }
                >
                  { option.label }
                </button>
              ) ) }
            </div>
          </div>

          <div className="border-t px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Set a precise time</p>
            <div className="grid grid-cols-[1fr_1fr_0.9fr] gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor={ `${ id }-hour` }>Hour</label>
              <Select
                value={ hour }
                onValueChange={ ( val ) => {
                  if ( val ) {
                    handleChange( val, minute, period );
                  }
                } }
                disabled={ disabled }
              >
                <SelectTrigger id={ `${ id }-hour` } className="h-9 w-full px-2">
                  <SelectValue placeholder="Hour" className="text-xs" />
                </SelectTrigger>
                <SelectContent className="vega-form dark">
                  { hours.map( ( h ) => (
                    <SelectItem key={ h } value={ h } className="text-xs">
                      { h }
                    </SelectItem>
                  ) ) }
                </SelectContent>
              </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor={ `${ id }-minute` }>Minute</label>
              <Select
                value={ minute }
                onValueChange={ ( val ) => {
                  if ( val ) {
                    handleChange( hour, val, period );
                  }
                } }
                disabled={ disabled }
              >
                <SelectTrigger id={ `${ id }-minute` } className="h-9 w-full px-2">
                  <SelectValue placeholder="Minute" className="text-xs" />
                </SelectTrigger>
                <SelectContent className="vega-form dark">
                  { minutes.map( ( m ) => (
                    <SelectItem key={ m } value={ m } className="text-xs">
                      { m }
                    </SelectItem>
                  ) ) }
                </SelectContent>
              </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor={ `${ id }-period` }>AM / PM</label>
              <Select
                value={ period }
                onValueChange={ ( val ) => {
                  if ( val ) {
                    handleChange( hour, minute, val );
                  }
                } }
                disabled={ disabled }
              >
                <SelectTrigger id={ `${ id }-period` } className="h-9 w-full px-2">
                  <SelectValue placeholder="AM / PM" className="text-xs" />
                </SelectTrigger>
                <SelectContent className="vega-form dark">
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

          { value && (
            <div className="border-t border-border bg-muted/30 px-4 py-2.5 text-center text-xs text-muted-foreground">
              Pickup set for <span className="font-medium text-foreground">{ displayValue }</span>
            </div>
          ) }
        </div>
      </PopoverContent>
    </Popover>
  );
};
