// Image format utilities for handling various image types including HEIC/HEIF

import heic2any from 'heic2any'

// Supported image MIME types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff'
] as const

// HEIC/HEIF MIME types that need conversion
export const HEIC_TYPES = [
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
] as const

// Check if a file is a supported image type
export function isSupportedImageType(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as any) ||
         HEIC_TYPES.includes(file.type as any)
}

// Check if a file is HEIC/HEIF format
export function isHeicFormat(file: File): boolean {
  return HEIC_TYPES.includes(file.type as any) ||
         file.name.toLowerCase().endsWith('.heic') ||
         file.name.toLowerCase().endsWith('.heif')
}

// Strip EXIF GPS data from image for privacy protection
export async function stripExifGps(file: File): Promise<File> {
  try {
    // Create bitmap with proper orientation handling
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image' // This applies EXIF orientation automatically
    })

    const { width, height } = bitmap

    // Create canvas to strip EXIF data
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // Optimize canvas settings
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw image - this strips all EXIF data including GPS
    ctx.drawImage(bitmap, 0, 0)

    // Convert to blob without EXIF data (privacy protection)
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', 0.9)
    )

    // Create new file with stripped EXIF
    const strippedFile = new File(
      [blob],
      file.name.replace(/\.(jpeg|jpg|png|webp|gif|bmp|tiff)$/i, '.jpg'),
      {
        type: 'image/jpeg',
        lastModified: file.lastModified
      }
    )

    if (import.meta.env.DEV) {
      console.log('EXIF GPS data stripped:', {
        original: { name: file.name, size: file.size, type: file.type },
        stripped: { name: strippedFile.name, size: strippedFile.size, type: strippedFile.type }
      })
    }

    return strippedFile
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('EXIF stripping failed:', error)
    }
    throw new Error(`Failed to strip EXIF data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Convert HEIC/HEIF to JPEG
export async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    if (import.meta.env.DEV) {
      console.log('Converting HEIC/HEIF to JPEG:', file.name)
    }

    // Convert HEIC to JPEG using heic2any
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9
    }) as Blob

    // Create a new File object with the converted blob
    const convertedFile = new File(
      [convertedBlob],
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      {
        type: 'image/jpeg',
        lastModified: file.lastModified
      }
    )

    if (import.meta.env.DEV) {
      console.log('HEIC conversion successful:', {
        original: { name: file.name, size: file.size, type: file.type },
        converted: { name: convertedFile.name, size: convertedFile.size, type: convertedFile.type }
      })
    }

    return convertedFile
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('HEIC conversion failed:', error)
    }
    throw new Error(`Failed to convert HEIC/HEIF image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Process and validate image file
export async function processImageFile(file: File): Promise<File> {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (JPG, PNG, WebP, HEIC, etc.)')
  }

  // Check if it's a supported format
  if (!isSupportedImageType(file)) {
    const supportedFormats = [...SUPPORTED_IMAGE_TYPES, ...HEIC_TYPES].join(', ')
    throw new Error(`Unsupported image format: ${file.type}. Supported formats: ${supportedFormats}`)
  }

  let processedFile = file

  // Convert HEIC/HEIF if needed
  if (isHeicFormat(file)) {
    processedFile = await convertHeicToJpeg(file)
  }

  // Strip EXIF GPS data for privacy protection (always do this)
  return await stripExifGps(processedFile)
}

// Get user-friendly error message for unsupported formats
export function getImageFormatErrorMessage(file: File): string {
  if (!file.type.startsWith('image/')) {
    return 'Please select a valid image file. Supported formats: JPG, PNG, WebP, HEIC, HEIF, GIF, BMP, TIFF'
  }

  if (!isSupportedImageType(file)) {
    return `Unsupported image format: ${file.type}. Please use JPG, PNG, WebP, HEIC, HEIF, GIF, BMP, or TIFF format.`
  }

  return 'Invalid image file'
}
