interface ResizeOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
}

/**
 * Redimensiona una imagen manteniendo su relación de aspecto.
 * La imagen se recorta al centro para que sea cuadrada.
 * @param file - El archivo de imagen original.
 * @param options - Opciones de redimensionamiento.
 * @returns - Una promesa que se resuelve con el Blob de la imagen redimensionada.
 */
export const resizeAndCropImage = (file: File, options: ResizeOptions): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const { maxWidth, maxHeight } = options;
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('No se pudo obtener el contexto del canvas.'));
        }

        // Lógica para recortar al centro y escalar
        const srcRatio = img.width / img.height;
        const destRatio = maxWidth / maxHeight;
        let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;

        if (srcRatio > destRatio) { // La imagen es más ancha que el destino
          srcWidth = img.height * destRatio;
          srcX = (img.width - srcWidth) / 2;
        } else { // La imagen es más alta o igual
          srcHeight = img.width / destRatio;
          srcY = (img.height - srcHeight) / 2;
        }

        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, maxWidth, maxHeight);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Fallo al crear el blob de la imagen.'));
          }
        }, file.type, options.quality || 0.9);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
