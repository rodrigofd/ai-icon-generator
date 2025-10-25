
/**
 * Removes a solid-color background from a base64 encoded image using a canvas.
 * It determines the background color by sampling the top-left pixel.
 * @param {string} base64Image - The raw base64 encoded image string.
 * @param {number} [tolerance=25] - The color tolerance for background removal. Higher values are more aggressive.
 * @returns {Promise<string>} - A promise that resolves with the base64 data URL of the image with a transparent background.
 */
export const removeGreenScreen = (base64Image: string, tolerance: number = 25): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Prevents tainted canvas errors
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            if (!ctx) {
                return reject(new Error('Could not get 2D canvas context'));
            }

            // Draw the image onto the canvas
            ctx.drawImage(img, 0, 0);
            
            try {
                // Sample the top-left pixel to determine the background color.
                const cornerPixel = ctx.getImageData(0, 0, 1, 1).data;
                const bgR = cornerPixel[0];
                const bgG = cornerPixel[1];
                const bgB = cornerPixel[2];

                // Get the pixel data from the entire canvas
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data; // This is a Uint8ClampedArray: [R, G, B, A, R, G, B, A, ...]

                // Iterate over each pixel
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    const rDiff = Math.abs(r - bgR);
                    const gDiff = Math.abs(g - bgG);
                    const bDiff = Math.abs(b - bgB);

                    // If the pixel color is close to the sampled background color, make it transparent
                    if (rDiff < tolerance && gDiff < tolerance && bDiff < tolerance) {
                        // Set the alpha channel to 0 for full transparency
                        data[i + 3] = 0;
                    }
                }
                
                // Put the modified pixel data back onto the canvas
                ctx.putImageData(imageData, 0, 0);

                // Export the canvas to a new data URL
                resolve(canvas.toDataURL('image/png'));
            } catch (error) {
                console.error("Error processing image data:", error);
                reject(new Error("Failed to process image for background removal. The image might be from a tainted canvas."));
            }
        };
        img.onerror = (err) => {
            reject(new Error(`Failed to load image for processing: ${err}`));
        };

        // The input is a raw base64 string, so we need to construct a data URL for the image source.
        img.src = `data:image/png;base64,${base64Image}`;
    });
};

/**
 * Resizes an image to fit within a new canvas, creating transparent padding.
 * The canvas size is kept the same as the original image.
 * @param {string} dataUrl - The base64 data URL of the image.
 * @param {number} padding - The number of transparent pixels to add on each side.
 * @returns {Promise<string>} - A promise that resolves with the base64 data URL of the padded image.
 */
export const addPadding = (dataUrl: string, padding: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (padding <= 0) {
            resolve(dataUrl);
            return;
        }

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get 2D canvas context'));
            }

            const newImageWidth = img.width - (padding * 2);
            const newImageHeight = img.height - (padding * 2);
            
            // If padding is too large, it results in a blank (transparent) image of the same size.
            if (newImageWidth > 0 && newImageHeight > 0) {
                // Draw the original image onto the canvas, scaled down and offset by the padding.
                ctx.drawImage(img, padding, padding, newImageWidth, newImageHeight);
            }

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            reject(new Error(`Failed to load image for padding: ${err}`));
        };
        img.src = dataUrl;
    });
};