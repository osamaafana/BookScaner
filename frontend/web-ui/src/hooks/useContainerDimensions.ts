import { useState, useEffect, useRef, type RefObject } from 'react'

interface Dimensions {
  width: number
  height: number
}

export function useContainerDimensions<T extends HTMLElement = HTMLDivElement>(): [
  RefObject<T | null>,
  Dimensions
] {
  const ref = useRef<T | null>(null)
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (ref.current) {
        const { width, height } = ref.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    // Initial measurement
    updateDimensions()

    // Create ResizeObserver for efficient dimension tracking
    const resizeObserver = new ResizeObserver(updateDimensions)

    if (ref.current) {
      resizeObserver.observe(ref.current)
    }

    // Fallback to window resize for older browsers
    window.addEventListener('resize', updateDimensions)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  return [ref, dimensions]
}
