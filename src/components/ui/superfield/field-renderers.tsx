import { ReactNode, useMemo, ForwardedRef } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputGroup, InputGroupInput, InputGroupSelect, InputGroupTextarea, InputGroupAddon, InputGroupText } from '@/components/ui/input-group';
import { SearchableSelect } from './searchable-select';
import { TagsInput } from './tags-input';
import { CalendarInput } from './calendar-input';
import { DatePickerInput } from './date-picker-input';
import { TimePickerInput } from './time-picker-input';
import {
  SelectFieldProps,
  SearchableSelectFieldProps,
  EditorFieldProps,
  TagsFieldProps,
  DatePickerFieldProps,
  TimePickerFieldProps,
  InputFieldProps,
  TextareaFieldProps,
  FileFieldProps,
  MultiSelectFieldProps
} from './types';
import { MultiSelectInput } from './multi-select-input';
import dynamic from 'next/dynamic';

const QuillEditor = dynamic( () => import( '@/components/ui/quill-editor' ).then( mod => mod.QuillEditor ), {
  ssr: false,
  loading: () => <div className="h-[150px] w-full rounded-md border border-input bg-transparent animate-pulse" />
} );


export interface BaseRendererProps {
  fieldId: string;
  required?: boolean;
  disabled?: boolean;
  ariaConfig: object;
  fieldClassName?: string;
  hasInputGroup: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  prefixAlign?: 'inline-start' | 'block-start';
  suffixAlign?: 'inline-end' | 'block-end';
}

const renderAddon = (
  content: ReactNode,
  align: 'inline-start' | 'block-start' | 'inline-end' | 'block-end'
) => {
  if ( !content ) return null;
  return (
    <InputGroupAddon align={ align }>
      { typeof content === 'string' ? (
        <InputGroupText>{ content }</InputGroupText>
      ) : (
        content
      ) }
    </InputGroupAddon>
  );
};

export const RenderInput = ( {
  props,
  base,
  ref
}: {
  props: InputFieldProps | FileFieldProps;
  base: BaseRendererProps;
  ref?: ForwardedRef<HTMLInputElement>;
} ) => {
  const {
    type,
    label,
    description,
    error,
    errors,
    fieldClassName,
    labelClassName,
    prefix,
    suffix,
    prefixAlign,
    suffixAlign,
    headerExtra,
    className,
    ...rest
  } = props;
  const commonProps = {
    id: base.fieldId,
    required: base.required,
    disabled: base.disabled,
    ...base.ariaConfig,
    className: base.fieldClassName,
  };

  const inputProps = {
    ...( rest as any ),
    ...commonProps,
    type: type as any,
    ref: ref,
  };

  if ( base.hasInputGroup ) {
    return (
      <InputGroup className={ base.fieldClassName }>
        { renderAddon( base.prefix, base.prefixAlign || 'inline-start' ) }
        <InputGroupInput { ...inputProps } />
        { renderAddon( base.suffix, base.suffixAlign || 'inline-end' ) }
      </InputGroup>
    );
  }

  return <Input { ...inputProps } />;
};

export const RenderDate = ( {
  props,
  base,
  ref
}: {
  props: InputFieldProps;
  base: BaseRendererProps;
  ref?: ForwardedRef<HTMLInputElement>;
} ) => {
  const {
    label,
    description,
    error,
    errors,
    fieldClassName,
    labelClassName,
    prefix,
    suffix,
    prefixAlign,
    suffixAlign,
    headerExtra,
    className,
    value,
    onChange,
    onBlur,
    placeholder,
    ...rest
  } = props;

  const commonProps = {
    id: base.fieldId,
    required: base.required,
    disabled: base.disabled,
    ...base.ariaConfig,
    className: base.fieldClassName,
  };

  const handleChange = ( dateString: string ) => {
    if ( onChange ) {
      // Create a synthetic event for compatibility
      const syntheticEvent = {
        target: { value: dateString },
        currentTarget: { value: dateString },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange( syntheticEvent );
    }
  };

  return (
    <CalendarInput
      { ...commonProps }
      value={ value as string || "" }
      onChange={ handleChange }
      onBlur={ onBlur as any }
      placeholder={ placeholder }
    />
  );
};

export const RenderTextarea = ( {
  props,
  base,
  ref
}: {
  props: TextareaFieldProps;
  base: BaseRendererProps;
  ref?: ForwardedRef<HTMLTextAreaElement>;
} ) => {
  const commonProps = {
    id: base.fieldId,
    required: base.required,
    disabled: base.disabled,
    ...base.ariaConfig,
    className: base.fieldClassName,
  };

  // Destructure type out since it's not needed for textarea
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    type: _type,
    label,
    description,
    error,
    errors,
    fieldClassName,
    labelClassName,
    prefix,
    suffix,
    prefixAlign,
    suffixAlign,
    headerExtra,
    className,
    ...restProps
  } = props as any;

  const textareaProps = {
    ...restProps,
    ...commonProps,
    ref: ref,
  };

  if ( base.hasInputGroup ) {
    return (
      <InputGroup className={ base.fieldClassName }>
        { renderAddon( base.prefix, base.prefixAlign || 'inline-start' ) }
        <InputGroupTextarea { ...textareaProps } />
        { renderAddon( base.suffix, base.suffixAlign || 'inline-end' ) }
      </InputGroup>
    );
  }
  return <Textarea { ...textareaProps } />;
};

export const RenderSelect = ( {
  props,
  base
}: {
  props: SelectFieldProps;
  base: BaseRendererProps;
} ) => {
  const { options, children, value, placeholder, onValueChange, defaultValue, name, onBlur } = props;
  const commonProps = {
    id: base.fieldId,
    required: base.required,
    disabled: base.disabled,
    onBlur,
    ...base.ariaConfig,
    className: base.fieldClassName,
  };

  const renderSelectItems = () => {
    if ( options ) {
      return options.map( ( option ) => {
        if ( typeof option === 'string' || typeof option === 'number' ) {
          return (
            <SelectItem key={ option } value={ String( option ) }>
              { option }
            </SelectItem>
          );
        }
        return (
          <SelectItem
            key={ option.value }
            value={ option.value }
            disabled={ option.disabled }
          >
            { option.label }
          </SelectItem>
        );
      } );
    }
    return children;
  };

  const selectedLabel = useMemo( () => {
    if ( !value || !options ) return null;
    const option = options.find( ( opt ) => {
      if ( typeof opt === "object" && opt !== null && "value" in opt ) {
        return opt.value === value;
      }
      return String( opt ) === value;
    } );
    return option ? ( typeof option === "object" && option !== null && "label" in option ? option.label : option ) : null;
  }, [ value, options ] );

  const selectContent = (
    <>
      <SelectTrigger { ...commonProps } className={ cn( base.fieldClassName ) }>
        <SelectValue>{ selectedLabel || placeholder }</SelectValue>
      </SelectTrigger>
      <SelectContent>{ renderSelectItems() }</SelectContent>
    </>
  );

  if ( base.hasInputGroup ) {
    return (
      <InputGroup className={ base.fieldClassName }>
        { renderAddon( base.prefix, base.prefixAlign || 'inline-start' ) }
        <Select
          value={ value }
          defaultValue={ defaultValue }
          onValueChange={ onValueChange }
          name={ name }
          disabled={ base.disabled }
          required={ base.required }
        >
          <InputGroupSelect { ...commonProps } className={ cn( base.fieldClassName ) }>
            <SelectValue>{ selectedLabel || placeholder }</SelectValue>
          </InputGroupSelect>
          <SelectContent>{ renderSelectItems() }</SelectContent>
        </Select>
        { renderAddon( base.suffix, base.suffixAlign || 'inline-end' ) }
      </InputGroup>
    );
  }

  return (
    <Select
      value={ value }
      defaultValue={ defaultValue }
      onValueChange={ onValueChange }
      name={ name }
      disabled={ base.disabled }
      required={ base.required }
    >
      { selectContent }
    </Select>
  );
};

export const RenderSearchableSelect = ( {
  props,
  base
}: {
  props: SearchableSelectFieldProps;
  base: BaseRendererProps;
} ) => {
  const { value, onValueChange, options, placeholder } = props;

  if ( base.hasInputGroup ) {
    return (
      <InputGroup className={ base.fieldClassName }>
        { renderAddon( base.prefix, base.prefixAlign || 'inline-start' ) }
        <SearchableSelect
          id={ base.fieldId }
          value={ value }
          onValueChange={ onValueChange }
          options={ options }
          placeholder={ placeholder }
          disabled={ base.disabled }
          required={ base.required }
          className={ cn( "rounded-none shadow-none focus-visible:ring-0 border-0 flex-1", base.fieldClassName ) }
        />
        { renderAddon( base.suffix, base.suffixAlign || 'inline-end' ) }
      </InputGroup>
    );
  }

  return (
    <SearchableSelect
      id={ base.fieldId }
      value={ value }
      onValueChange={ onValueChange }
      options={ options }
      placeholder={ placeholder }
      disabled={ base.disabled }
      required={ base.required }
      className={ base.fieldClassName }
    />
  );
};

export const RenderCheckbox = () => null;

export const RenderSwitch = () => null;

export const RenderTags = ( {
  props,
  base
}: {
  props: TagsFieldProps;
  base: BaseRendererProps;
} ) => {
  const { value, onChange, placeholder, onBlur, size, expand } = props;
  return (
    <TagsInput
      id={ base.fieldId }
      value={ value }
      onChange={ onChange }
      onBlur={ onBlur }
      placeholder={ placeholder }
      disabled={ base.disabled }
      className={ base.fieldClassName }
      ariaConfig={ base.ariaConfig }
      size={ size }
      expand={ expand }
    />
  );
};

export const RenderEditor = () => null;

export const RenderDatePicker = ( {
  props,
  base
}: {
  props: DatePickerFieldProps;
  base: BaseRendererProps;
} ) => {
  const { value, onChange, placeholder, dateFormat, locale, minDate, maxDate, onBlur } = props;
  return (
    <DatePickerInput
      id={ base.fieldId }
      value={ value }
      onChange={ onChange }
      onBlur={ onBlur }
      placeholder={ placeholder }
      disabled={ base.disabled }
      className={ base.fieldClassName }
      ariaConfig={ base.ariaConfig }
      dateFormat={ dateFormat }
      locale={ locale }
      minDate={ minDate }
      maxDate={ maxDate }
    />
  );
};

export const RenderTimePicker = ( {
  props,
  base
}: {
  props: TimePickerFieldProps;
  base: BaseRendererProps;
} ) => {
  const { value, onChange, placeholder, onBlur } = props;

  const handleChange = ( timeString: string ) => {
    if ( onChange ) {
      // Create a synthetic event for compatibility
      const syntheticEvent = {
        target: { value: timeString },
        currentTarget: { value: timeString },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange( syntheticEvent );
    }
  };

  return (
    <TimePickerInput
      id={ base.fieldId }
      value={ value as string || "" }
      onChange={ handleChange }
      onBlur={ onBlur }
      placeholder={ placeholder }
      disabled={ base.disabled }
      className={ base.fieldClassName }
    />
  );
};

export const RenderMultiSelect = ( {
  props,
  base
}: {
  props: MultiSelectFieldProps;
  base: BaseRendererProps;
} ) => {
  const { value, onValueChange, options, placeholder, allowCustom } = props;
  return (
    <MultiSelectInput
      id={ base.fieldId }
      value={ value }
      onValueChange={ onValueChange }
      options={ options }
      placeholder={ placeholder }
      disabled={ base.disabled }
      required={ base.required }
      className={ base.fieldClassName }
      allowCustom={ allowCustom }
    />
  );
};

// Import LocationInput
import { LocationInput } from './location-input';
import { LocationFieldProps } from './types';
// export const RenderLocation = ...
// The imports are fine.
// But I need to update imports in types.ts too.

export const RenderLocation = ( {
  props,
  base
}: {
  props: LocationFieldProps;
  base: BaseRendererProps;
} ) => {
  const { value, onChange, onLocationSelect, placeholder, onBlur } = props;

  if ( base.hasInputGroup ) {
    return (
      <InputGroup className={ base.fieldClassName }>
        { renderAddon( base.prefix, base.prefixAlign || 'inline-start' ) }
        <LocationInput
          id={ base.fieldId }
          value={ value || "" }
          onChange={ onChange! }
          onLocationSelect={ onLocationSelect }
          onBlur={ onBlur }
          placeholder={ placeholder }
          // disabled={base.disabled} // LocationInput doesn't support disabled yet? Check impl.
          className={ cn( "rounded-none shadow-none focus-visible:ring-0 border-0 flex-1", base.fieldClassName ) }
          aria-invalid={ base.ariaConfig && ( base.ariaConfig as any )[ 'aria-invalid' ] }
        />
        { renderAddon( base.suffix, base.suffixAlign || 'inline-end' ) }
      </InputGroup>
    );
  }

  return (
    <LocationInput
      id={ base.fieldId }
      value={ value || "" }
      onChange={ onChange! }
      onLocationSelect={ onLocationSelect }
      onBlur={ onBlur }
      placeholder={ placeholder }
      className={ base.fieldClassName }
      aria-invalid={ base.ariaConfig && ( base.ariaConfig as any )[ 'aria-invalid' ] }
    />
  );
};
