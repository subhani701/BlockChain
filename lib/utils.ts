import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display hex values without the 0x prefix (UI convention). */
export function formatHexDisplay(value: string): string {
  return value.replace(/^0x/i, '')
}
