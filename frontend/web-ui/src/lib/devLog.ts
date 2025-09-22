// Development-only logging utility
// Prevents console.log statements from appearing in production builds

export function devLog(...args: any[]): void {
  if (import.meta.env.DEV) {
    console.log(...args)
  }
}

export function devWarn(...args: any[]): void {
  if (import.meta.env.DEV) {
    console.warn(...args)
  }
}

export function devError(...args: any[]): void {
  if (import.meta.env.DEV) {
    console.error(...args)
  }
}

export function devInfo(...args: any[]): void {
  if (import.meta.env.DEV) {
    console.info(...args)
  }
}
