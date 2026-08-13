export function resolveSettingValue( stored: string | null | undefined, environment: string | null | undefined, fallback: string ): string {
  return stored?.trim() || environment?.trim() || fallback;
}
