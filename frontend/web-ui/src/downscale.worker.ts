// downscale.worker.ts
self.onmessage = async (e) => {
  try {
    console.log('Worker received message:', e.data);
    const { file, maxEdge } = e.data;

    if (!file || !maxEdge) {
      console.error('Worker: Invalid data received');
      postMessage({ error: 'Invalid data' });
      return;
    }

    // Create bitmap with proper EXIF orientation handling
    const bmp = await createImageBitmap(file, {
      imageOrientation: 'from-image' // This applies EXIF orientation automatically
    });
    console.log('Worker: Image bitmap created with proper orientation', bmp.width, 'x', bmp.height);

    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    console.log('Worker: Scale calculated:', scale);

    // @ts-expect-error OffscreenCanvas in worker
    const c = new OffscreenCanvas(Math.round(bmp.width*scale), Math.round(bmp.height*scale));
    const ctx = c.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    // Optimize canvas settings for better performance
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw with proper orientation (already applied by createImageBitmap)
    ctx.drawImage(bmp, 0, 0, c.width, c.height);

    // Convert to blob without EXIF data (privacy protection)
    const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    console.log('Worker: Blob created without EXIF data, size:', blob.size);
    postMessage({ blob });
  } catch (error) {
    console.error('Worker error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    postMessage({ error: errorMessage });
  }
};
