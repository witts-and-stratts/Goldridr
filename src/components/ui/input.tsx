import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ( { className, type, ...props }, ref ) => {
    return (
      <InputPrimitive
        ref={ ref }
        type={ type }
        data-slot="input"
        className={ cn(
          "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-12 rounded-none border bg-transparent px-2.5 py-1 text-base transition-colors file:h-10 file:text-base file:font-medium focus-visible:ring-1 aria-invalid:ring-1 md:text-base file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 font-sans font-light",
          className
        ) }
        { ...props }
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
