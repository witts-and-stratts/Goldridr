'use client';

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from "motion/react";
import { ForwardedRef, forwardRef, useId } from "react";
import {
  BaseRendererProps,
  RenderCheckbox,
  RenderDatePicker,
  RenderTimePicker,
  RenderEditor,
  RenderInput,
  RenderSearchableSelect,
  RenderSelect,
  RenderSwitch,
  RenderTags,
  RenderTextarea,
  RenderMultiSelect,
  RenderDate
} from './superfield/field-renderers';
import {
  DatePickerFieldProps,
  TimePickerFieldProps,
  FileFieldProps,
  InputFieldProps,
  SearchableSelectFieldProps,
  SelectFieldProps,
  SelectOption,
  TagsFieldProps,
  TextareaFieldProps,
  MultiSelectFieldProps,
  LocationFieldProps
} from "./superfield/types";
import { RenderLocation } from "./superfield/field-renderers";

// Discriminated union of all field types
type SuperFieldProps =
  | InputFieldProps
  | TextareaFieldProps
  | FileFieldProps
  | SelectFieldProps
  // | CheckboxFieldProps
  | TagsFieldProps
  // | EditorFieldProps
  | SearchableSelectFieldProps
  | DatePickerFieldProps
  | TimePickerFieldProps
  // | SwitchFieldProps
  | MultiSelectFieldProps
  | LocationFieldProps;

const renderers: Record<string, React.ElementType> = {
  'select': RenderSelect,
  'searchable-select': RenderSearchableSelect,
  'multi-select': RenderMultiSelect,
  'textarea': RenderTextarea,
  'date': RenderDate,
  // 'checkbox': RenderCheckbox,
  // 'switch': RenderSwitch,
  'tags': RenderTags,
  // 'editor': RenderEditor,
  'datepicker': RenderDatePicker,
  'timepicker': RenderTimePicker,
  'location': RenderLocation,
  'file': RenderInput,
  'default': RenderInput
};

/**
 * SuperField Component
 * A high-level abstraction for form fields, combining Label, Input/Textarea/Select, and Error handling.
 * Supports InputGroups (prefixes/suffixes) and is fully accessible.
 *
 * Supported field types:
 * - text, email, password, number, tel, url, search, date, time, datetime-local
 * - textarea
 * - file
 * - select (with options array or children)
 * - searchable-select
 * - tags
 * - editor
 * - checkbox
 * - datepicker
 * - switch
 *
 * @example
 * // Searchable Select
 * <SuperField
 *   type="searchable-select"
 *   label="Framework"
 *   options={[
 *     { label: "React", value: "react" },
 *     { label: "Vue", value: "vue" }
 *   ]}
 * />
 *
 * @example
 * // Date Picker
 * <SuperField
 *   type="datepicker"
 *   label="Start Date"
 *   value={new Date()}
 *   onChange={(date) => console.log(date)}
 *   placeholder="Select a date"
 * />
 *
 * @example
 * // Tags
 * <SuperField
 *   type="tags"
 *   label="Skills"
 *   value={['React', 'Next.js']}
 *   onChange={(tags) => console.log(tags)}
 * />
 */
export const SuperField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  SuperFieldProps
>( ( props, ref ) => {
  const {
    label,
    description,
    error,
    errors,
    required,
    disabled,
    className,
    fieldClassName,
    labelClassName,
    type,
    prefix,
    suffix,
    prefixAlign = 'inline-start',
    suffixAlign = 'inline-end',
    headerExtra,
    id,
    ...rest
  } = props;

  const generatedId = useId();
  const fieldId = id || generatedId;
  const hasInputGroup = !!( prefix || suffix ) && type !== 'file';

  const ariaConfig = {
    'aria-invalid': !!( error || errors?.length ),
    'aria-describedby':
      description || error || errors?.length
        ? `${ fieldId }-description ${ fieldId }-error`
        : undefined,
  };

  const isCheckable = ( type as string ) === 'checkbox' || ( type as string ) === 'switch';
  const Renderer = renderers[ type ] || renderers[ 'default' ];

  const baseProps: BaseRendererProps = {
    fieldId,
    required,
    disabled,
    ariaConfig,
    fieldClassName,
    hasInputGroup,
    prefix,
    suffix,
    prefixAlign,
    suffixAlign
  };

  const renderControl = () => (
    <Renderer
      props={ props }
      base={ baseProps }
      ref={ ref as ForwardedRef<any> }
    />
  );

  return (
    <Field
      className={ cn( className, ) }
      data-disabled={ disabled }
      data-invalid={ !!( error || errors?.length ) }
      orientation={ isCheckable ? 'horizontal' : 'vertical' }
    >
      { isCheckable ? (
        <>
          { renderControl() }
          <FieldContent>
            { label && (
              <FieldLabel htmlFor={ fieldId } className={ cn( "cursor-pointer", labelClassName ) }>
                { label }
                { required && <span className='text-destructive -ml-1'>*</span> }
              </FieldLabel>
            ) }
            { description && (
              <FieldDescription id={ `${ fieldId }-description` }>
                { description }
              </FieldDescription>
            ) }
            <AnimatePresence mode='wait'>
              { ( error || errors ) && (
                <motion.div initial={ { opacity: 0, height: 0 } } animate={ { opacity: 1, height: "auto" } } exit={ { opacity: 0, height: 0 } }>
                  <FieldError id={ `${ fieldId }-error` } errors={ errors } className="font-regular">
                    { error }
                  </FieldError>
                </motion.div>
              ) }
            </AnimatePresence>
          </FieldContent>
        </>
      ) : (
        <>
          { label && (
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor={ fieldId } className={ labelClassName }>
                { label }
                { required && <span className='text-destructive -ml-1'>*</span> }
              </FieldLabel>
              { headerExtra }
            </div>
          ) }
          { description && (
            <FieldDescription id={ `${ fieldId }-description` }>
              { description }
            </FieldDescription>
          ) }
          { renderControl() }
          <AnimatePresence mode='wait'>
            { ( error || errors ) && (
              <motion.div initial={ { opacity: 0, height: 0 } } animate={ { opacity: 1, height: "auto" } } exit={ { opacity: 0, height: 0 } }>
                <FieldError id={ `${ fieldId }-error` } errors={ errors } className="font-regular">
                  { error }
                </FieldError>
              </motion.div>
            ) }
          </AnimatePresence>
        </>
      ) }
    </Field>
  );
} );

SuperField.displayName = 'SuperField';

// Export types for external use
export type { SelectOption };
