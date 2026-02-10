"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface CalendarInputProps {
  id?: string;
  value?: string;
  onChange?: ( value: string ) => void;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function CalendarInput( {
  id,
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  disabled,
  required,
  className,
  ...ariaProps
}: CalendarInputProps ) {
  const [ open, setOpen ] = React.useState( false );

  // Convert string value to Date object
  const selectedDate = value ? new Date( value ) : undefined;

  const handleSelect = ( date: Date | undefined ) => {
    if ( date ) {
      // Format as YYYY-MM-DD for form compatibility
      const formattedDate = format( date, "yyyy-MM-dd" );
      onChange?.( formattedDate );
    } else {
      onChange?.( "" );
    }
    setOpen( false );
  };

  return (
    <Popover open={ open } onOpenChange={ setOpen }>
      <PopoverTrigger>
        <Button
          id={ id }
          variant="outline"
          size={ 'lg' }
          className={ cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          ) }
          disabled={ disabled }
          onBlur={ onBlur }
          { ...ariaProps }
        >
          <CalendarIcon className="mr-2 size-4" strokeWidth={ 1 } />
          { value ? format( new Date( value ), "PPP" ) : <span>{ placeholder }</span> }
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={ selectedDate }
          onSelect={ handleSelect }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
