// Envolve o Tesseract.js (carregado como script global em index.html).

/**
 * Redimensiona a imagem para no máximo 1200px de largura/altura mantendo a proporção,
 * reduzindo drasticamente o peso e o tempo de processamento do OCR no celular.
 */
function comprimirImagem(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', 0.85); // Converte para JPEG com 85% de qualidade
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * @param {File|Blob} file Imagem da etiqueta.
 * @param {(m: {status?: string, progress?: number}) => void} [onProgress]
 * @returns {Promise<string>} Texto bruto reconhecido (uso interno; não é exibido).
 */
async function recognizeText(file, onProgress) {
  if (!window.Tesseract) {
    throw new Error('Tesseract.js não foi carregado. Verifique a conexão com a internet.');
  }

  // Comprime e redimensiona a imagem antes de rodar o OCR para evitar travamentos no celular
  const imagemOtimizada = await comprimirImagem(file);

  const result = await window.Tesseract.recognize(imagemOtimizada, 'por+eng', {
    logger: m => onProgress?.(m)
  });
  return result.data.text || '';
}