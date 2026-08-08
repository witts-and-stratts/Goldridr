import type { ReactNode } from "react"

export type SelectOption =
  | number
  | string
  | { label: ReactNode; value: string; disabled?: boolean }

export interface BaseFieldProps {
  label?: string
  description?: string
  error?: string
  errors?: Array<{ message?: string } | undefined>
  required?: boolean
  disabled?: boolean
  className?: string
  fieldClassName?: string
  labelClassName?: string
  prefix?: ReactNode
  suffix?: ReactNode
  prefixAlign?: "inline-start" | "block-start"
  suffixAlign?: "inline-end" | "block-end"
  headerExtra?: ReactNode
}
