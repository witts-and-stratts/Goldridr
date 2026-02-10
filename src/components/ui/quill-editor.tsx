'use client';

import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

export type QuillToolbarConfig = ( string[] | Record<string, any>[] | string )[];

interface QuillEditorProps {
  value?: string;
  onChange?: ( value: string ) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  toolbar?: QuillToolbarConfig;
}

const defaultToolbar: QuillToolbarConfig = [
  [ 'bold', 'italic', 'underline', 'strike' ],
  [ { 'list': 'ordered' }, { 'list': 'bullet' } ],
  [ 'clean' ]
];

export function QuillEditor( { value, onChange, onBlur, placeholder, className, disabled, toolbar = defaultToolbar }: QuillEditorProps ) {
  const containerRef = useRef<HTMLDivElement>( null );
  const quillRef = useRef<Quill | null>( null );
  const isInternalChange = useRef( false );
  const lastValueRef = useRef( value );
  const onBlurRef = useRef( onBlur );

  useEffect( () => {
    onBlurRef.current = onBlur;
  }, [ onBlur ] );

  useEffect( () => {
    if ( !containerRef.current ) return;

    if ( !quillRef.current ) {
      const quill = new Quill( containerRef.current, {
        theme: 'snow',
        placeholder: placeholder,
        modules: {
          toolbar: toolbar
        },
        readOnly: disabled
      } );

      quillRef.current = quill;

      // Set initial value if provided (important for persisted form state)
      if ( value && value !== '<p><br></p>' ) {
        quill.root.innerHTML = value;
        lastValueRef.current = value;
      }

      quill.on( 'text-change', () => {
        if ( onChange ) {
          isInternalChange.current = true;
          // Send HTML content
          const content = quill.root.innerHTML;
          lastValueRef.current = content;
          onChange( content );
          isInternalChange.current = false;
        }
      } );

      quill.on( 'selection-change', ( range, oldRange ) => {
        if ( range === null && oldRange !== null ) {
          onBlurRef.current?.();
        }
      } );
    }

    return () => {
      // Cleanup if needed
    };
  }, [] ); // Init once

  // Handle external value changes
  useEffect( () => {
    const quill = quillRef.current;
    console.debug( '[QuillEditor] value prop changed:', value, 'lastValueRef:', lastValueRef.current, 'quillReady:', !!quill );
    if ( quill && value !== undefined && value !== lastValueRef.current && !isInternalChange.current ) {
      // Prevent stale props from overwriting local state while user is typing
      if ( quill.hasFocus() ) {
        console.debug( '[QuillEditor] Quill has focus, skipping update' );
        return;
      }

      if ( value !== quill.root.innerHTML ) {
        console.debug( '[QuillEditor] Updating quill content from prop' );
        quill.root.innerHTML = value;
      }
      lastValueRef.current = value;
    }
  }, [ value ] );

  // Handle disabled state change
  useEffect( () => {
    if ( quillRef.current ) {
      quillRef.current.enable( !disabled );
    }
  }, [ disabled ] );

  return (
    <div className={ cn(
      "quill-editor-wrapper flex flex-col rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow]",
      "focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-ring",
      "dark:bg-input/30",
      className
    ) }>
      <div ref={ containerRef } className="min-h-[150px] text-foreground flex-1" />
      <style jsx global>{ `
        .quill-editor-wrapper .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid hsl(var(--input));
          background-color: transparent;
          padding: 8px;
          font-family: var(--font-secondary), ui-sans-serif, system-ui, sans-serif;
        }
        .quill-editor-wrapper .ql-container.ql-snow {
          border: none;
          font-family: var(--font-secondary), ui-sans-serif, system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .quill-editor-wrapper .ql-editor {
          min-height: 150px;
          flex: 1;
          font-family: var(--font-secondary), ui-sans-serif, system-ui, sans-serif;
          font-size: 0.875rem;
          line-height: 1.5;
          font-weight: 400;
          padding: 0.625rem 0.75rem;
        }
        .quill-editor-wrapper .ql-editor p {
          font-weight: 300;
        }
        .quill-editor-wrapper .ql-editor p,
        .quill-editor-wrapper .ql-editor li,
        .quill-editor-wrapper .ql-editor span {
          font-family: inherit;
        }
        .quill-editor-wrapper .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
          font-family: var(--font-secondary), ui-sans-serif, system-ui, sans-serif;
          left: 0.75rem;
          right: 0.75rem;
        }
          .quill-editor .ql-blank p {
            font-weight: 300;
          }
      `}</style>
    </div>
  );
}
