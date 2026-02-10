import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { BaseFieldProps, SelectOption } from "./types";

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  value?: string;
  onValueChange?: ( value: string | null ) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export interface SearchableSelectFieldProps extends BaseFieldProps, Omit<SearchableSelectProps, keyof BaseFieldProps> {
  type: 'searchable-select';
}

export const SearchableSelect = ( {
  id,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  required
}: SearchableSelectProps ) => {
  const [ open, setOpen ] = useState( false );
  const [ width, setWidth ] = useState( 0 );
  const triggerRef = useRef<HTMLButtonElement>( null );

  const selectedOption = options.find( ( option ) => {
    if ( typeof option === 'object' && option !== null && 'value' in option ) {
      return option.value === value;
    }
    return String( option ) === value;
  } );

  const selectedLabel = selectedOption
    ? ( typeof selectedOption === 'object' && 'label' in selectedOption ? selectedOption.label : selectedOption )
    : null;

  // Update width before opening or on window resize
  useEffect( () => {
    if ( open && triggerRef.current ) {
      setWidth( triggerRef.current.offsetWidth );
    }
  }, [ open ] );

  // Also handle resize to keep it responsive
  useEffect( () => {
    const handleResize = () => {
      if ( triggerRef.current ) {
        setWidth( triggerRef.current.offsetWidth );
      }
    };
    window.addEventListener( 'resize', handleResize );
    return () => window.removeEventListener( 'resize', handleResize );
  }, [] );


  return (
    <Popover open={ open } onOpenChange={ setOpen }>
      <PopoverTrigger
        ref={ triggerRef }
        id={ id }
        aria-expanded={ open }
        className={ cn(
          "border-input data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 gap-1.5 rounded-md border bg-transparent py-2 pr-2 pl-2.5 text-sm shadow-xs transition-[color,box-shadow] focus-visible:ring-[3px] aria-invalid:ring-[3px] h-9 [&_svg:not([class*='size-'])]:size-4 flex w-full items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          !value && "text-muted-foreground",
          className
        ) }
        disabled={ disabled }
      >
        <span className="flex flex-1 text-left line-clamp-1">
          { selectedLabel || placeholder || "Select..." }
        </span>
        <HugeiconsIcon icon={ UnfoldMoreIcon } strokeWidth={ 2 } className="text-muted-foreground size-4 pointer-events-none" />
      </PopoverTrigger>
      <PopoverContent
        className="bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-md shadow-md ring-1 duration-100 p-0"
        align="start"
        style={ { width: width ? `${ width }px` : undefined } }
      >
        <Command>
          <CommandInput placeholder={ placeholder || "Search..." } className="h-9" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="w-full">
              { options.map( ( option ) => {
                const optValue = typeof option === 'object' && option !== null && 'value' in option ? option.value : String( option );
                const optLabel = typeof option === 'object' && option !== null && 'label' in option ? option.label : String( option );
                const optDisabled = typeof option === 'object' && option !== null && 'disabled' in option ? option.disabled : false;

                return (
                  <CommandItem
                    key={ optValue }
                    value={ optLabel as string }
                    onSelect={ () => {
                      onValueChange?.( optValue );
                      setOpen( false );
                    } }
                    disabled={ optDisabled }
                    className="data-selected:bg-accent data-selected:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 bg-background"
                  >
                    <span className="line-clamp-1">{ optLabel }</span>
                    { value === optValue && (
                      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        <HugeiconsIcon
                          icon={ Tick02Icon }
                          strokeWidth={ 2 }
                          className="h-4 w-4"
                        />
                      </span>
                    ) }
                  </CommandItem>
                );
              } ) }
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
