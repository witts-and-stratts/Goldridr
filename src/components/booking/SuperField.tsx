"use client";

import { Field, FieldApi, FormApi } from "@tanstack/react-form";
import {
  Field as UIField,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationAutocomplete } from "./LocationAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReactNode } from "react";

interface SuperFieldProps<TData, TName extends string> {
  form: any;
  name: TName;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "time" | "textarea" | "location" | "select";
  options?: { label: string; value: string; }[];
  className?: string;
  description?: string;
  autoComplete?: string;
  children?: ReactNode;
  renderInput?: ( props: {
    value: any;
    onChange: ( val: any ) => void;
    onBlur: () => void;
    isInvalid: boolean;
    id: string;
    name: string;
  } ) => ReactNode;
}

export function SuperField<TData, TName extends string>( {
  form,
  name,
  label,
  placeholder,
  type = "text",
  options,
  className,
  description,
  autoComplete,
  renderInput,
}: SuperFieldProps<TData, TName> ) {
  return (
    <form.Field
      name={ name }
      children={ ( fieldApi: any ) => {
        const isInvalid = fieldApi.state.meta.isTouched && fieldApi.state.meta.errors.length > 0;
        const errorMessage = fieldApi.state.meta.errors.length ? fieldApi.state.meta.errors.join( ", " ) : undefined;

        return (
          <UIField className={ className } data-invalid={ isInvalid }>
            <FieldLabel htmlFor={ fieldApi.name }>{ label }</FieldLabel>

            { renderInput ? (
              renderInput( {
                value: fieldApi.state.value,
                onChange: fieldApi.handleChange,
                onBlur: fieldApi.handleBlur,
                isInvalid,
                id: fieldApi.name,
                name: fieldApi.name,
              } )
            ) : type === "location" ? (
              <LocationAutocomplete
                name={ fieldApi.name }
                value={ fieldApi.state.value as string }
                onChange={ ( val ) => fieldApi.handleChange( val as any ) }
                onBlur={ fieldApi.handleBlur }
                placeholder={ placeholder }
                isInvalid={ isInvalid }
              />
            ) : type === "textarea" ? (
              <Textarea
                id={ fieldApi.name }
                name={ fieldApi.name }
                value={ fieldApi.state.value as string }
                onChange={ ( e ) => fieldApi.handleChange( e.target.value as any ) }
                onBlur={ fieldApi.handleBlur }
                placeholder={ placeholder }
                aria-invalid={ isInvalid }
              />
            ) : type === "select" && options ? (
              <Select
                value={ fieldApi.state.value as string }
                onValueChange={ ( val ) => fieldApi.handleChange( val as any ) }
              >
                <SelectTrigger id={ fieldApi.name } aria-invalid={ isInvalid }>
                  <SelectValue placeholder={ placeholder } />
                </SelectTrigger>
                <SelectContent>
                  { options.map( ( opt ) => (
                    <SelectItem key={ opt.value } value={ opt.value }>
                      { opt.label }
                    </SelectItem>
                  ) ) }
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={ fieldApi.name }
                name={ fieldApi.name }
                type={ type }
                value={ fieldApi.state.value as string }
                onChange={ ( e ) => fieldApi.handleChange( e.target.value as any ) }
                onBlur={ fieldApi.handleBlur }
                placeholder={ placeholder }
                autoComplete={ autoComplete }
                aria-invalid={ isInvalid }
              />
            ) }

            { description && <p className="text-sm text-muted-foreground">{ description }</p> }
            { isInvalid && <FieldError errors={ fieldApi.state.meta.errors } /> }
          </UIField>
        );
      } }
    />
  );
}
