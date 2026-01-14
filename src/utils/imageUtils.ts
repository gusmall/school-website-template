/**
 * Image compression utilities for optimizing uploads
 */

export interface CompressOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

/**
 * Compress an image file before upload
 * @param file - The original image file
 * @param options - Compression options
 * @returns Compressed image as a Blob in WebP format
 */
export const compressImage = (
    file: File,
    options: CompressOptions = {}
): Promise<Blob> => {
    const { maxWidth = 800, maxHeight = 800, quality = 0.8 } = options;

    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to compress image'));
                    }
                },
                'image/webp',
                quality
            );

            // Cleanup
            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image'));
        };

        img.src = URL.createObjectURL(file);
    });
};

/**
 * Preset compression options for different use cases
 */
export const compressionPresets = {
    avatar: { maxWidth: 400, maxHeight: 400, quality: 0.8 },
    profile: { maxWidth: 600, maxHeight: 800, quality: 0.8 },
    cover: { maxWidth: 1200, maxHeight: 800, quality: 0.85 },
    gallery: { maxWidth: 1600, maxHeight: 1200, quality: 0.85 },
    thumbnail: { maxWidth: 300, maxHeight: 300, quality: 0.7 },
    event: { maxWidth: 1000, maxHeight: 700, quality: 0.8 },
};

/**
 * Generate a WebP filename
 */
export const generateWebPFilename = (prefix: string): string => {
    return `${prefix}_${Date.now()}.webp`;
};