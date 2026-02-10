import { Combobox, ComboboxChips, ComboboxChip, ComboboxChipsInput, ComboboxContent, ComboboxList, ComboboxItem } from '@/components/ui/combobox';
import { BaseFieldProps, SelectOption } from "./types";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface MultiSelectInputProps {
  id?: string;
  value?: string[];
  onValueChange?: ( value: string[] ) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  allowCustom?: boolean;
}

export interface MultiSelectFieldProps extends BaseFieldProps, Omit<MultiSelectInputProps, keyof BaseFieldProps> {
  type: 'multi-select';
}

function SortableChip( { id, children }: { id: string; children: React.ReactNode; } ) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable( { id } );

  const style = {
    transform: CSS.Transform.toString( transform ),
    transition,
  };

  return (
    <div ref={ setNodeRef } style={ style } { ...attributes } { ...listeners }>
      { children }
    </div>
  );
}

export const MultiSelectInput = ( {
  id,
  value = [],
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  required,
  allowCustom
}: MultiSelectInputProps ) => {
  const ref = useRef<HTMLDivElement>( null );
  const [ width, setWidth ] = useState( 0 );
  const [ inputValue, setInputValue ] = useState( "" );

  const sensors = useSensors(
    useSensor( PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    } ),
    useSensor( KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    } )
  );

  useEffect( () => {
    if ( ref.current ) {
      setWidth( ref.current.offsetWidth );
    }
  }, [ ref ] );

  const filteredOptions = options.filter( ( option ) => {
    const label = typeof option === 'object' && option !== null && 'label' in option ? option.label : String( option );
    const labelStr = ( typeof label === 'string' || typeof label === 'number' ) ? String( label ) : '';
    return labelStr.toLowerCase().includes( inputValue.toLowerCase() );
  } );

  const showCustomOption = allowCustom && inputValue.length > 0 && !options.some( opt => {
    const val = typeof opt === 'object' && opt !== null && 'value' in opt ? opt.value : String( opt );
    const label = typeof opt === 'object' && opt !== null && 'label' in opt ? opt.label : String( opt );
    const labelStr = ( typeof label === 'string' || typeof label === 'number' ) ? String( label ) : '';
    return val.toLowerCase() === inputValue.toLowerCase() || labelStr.toLowerCase() === inputValue.toLowerCase();
  } );

  const handleDragEnd = ( event: DragEndEvent ) => {
    const { active, over } = event;

    if ( active.id !== over?.id ) {
      const oldIndex = value.indexOf( active.id as string );
      const newIndex = value.indexOf( over?.id as string );

      if ( oldIndex !== -1 && newIndex !== -1 ) {
        onValueChange?.( arrayMove( value, oldIndex, newIndex ) );
      }
    }
  };

  return (
    <div ref={ ref }>
      <Combobox
        value={ value }
        onValueChange={ ( val ) => {
          onValueChange?.( val as string[] );
          setInputValue( "" );
        } }
        multiple
        inputValue={ inputValue }
        onInputValueChange={ setInputValue }
      >
        <DndContext
          sensors={ sensors }
          collisionDetection={ closestCenter }
          onDragEnd={ handleDragEnd }
        >
          <ComboboxChips className={ cn( className ) }>
            <SortableContext items={ value } strategy={ horizontalListSortingStrategy }>
              { value.map( ( val ) => {
                // Find label from options
                const option = options.find( opt => {
                  if ( typeof opt === 'object' && opt !== null && 'value' in opt ) {
                    return opt.value === val;
                  }
                  return String( opt ) === val;
                } );
                const label = option
                  ? ( typeof option === 'object' && 'label' in option ? option.label : option )
                  : val;

                return (
                  <SortableChip key={ val } id={ val }>
                    <ComboboxChip>
                      { label }
                    </ComboboxChip>
                  </SortableChip>
                );
              } ) }
            </SortableContext>
            <ComboboxChipsInput
              placeholder={ value.length === 0 ? ( placeholder || "Select..." ) : undefined }
              id={ id }
              required={ required }
              disabled={ disabled }
              onKeyDown={ ( e ) => {
                if ( e.key === 'Enter' || ( allowCustom && e.key === ',' ) ) {
                  e.preventDefault();
                  e.stopPropagation();

                  if ( allowCustom && inputValue.trim().length > 0 ) {
                    const newValue = inputValue.trim();
                    if ( !value.includes( newValue ) ) {
                      onValueChange?.( [ ...value, newValue ] );
                    }
                    setInputValue( "" );
                  }
                }
              } }
            />
          </ComboboxChips>
        </DndContext>
        <ComboboxContent className={ cn( 'min-w-(--anchor-width) w-(--anchor-width)' ) } style={ { 'width': `${ width }px`, } } sideOffset={ 16 } align="end" alignOffset={ -10 }>
          <ComboboxList>
            { filteredOptions.length === 0 && !showCustomOption && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) }
            { filteredOptions.map( ( option ) => {
              const optValue = typeof option === 'object' && option !== null && 'value' in option ? option.value : String( option );
              const optLabel = typeof option === 'object' && option !== null && 'label' in option ? option.label : String( option );
              const optDisabled = typeof option === 'object' && option !== null && 'disabled' in option ? option.disabled : false;

              return (
                <ComboboxItem key={ optValue } value={ optValue as string } disabled={ optDisabled } className={ 'capitalize' }>
                  { optLabel }
                </ComboboxItem>
              );
            } ) }
            { showCustomOption && (
              <ComboboxItem key="__custom__" value={ inputValue }>
                Create "{ inputValue }"
              </ComboboxItem>
            ) }
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
};
