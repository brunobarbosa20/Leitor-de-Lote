// Envolve o Tesseract.js (carregado como script global em index.html).

/**
 * Redimensiona, comprime e recorta a região central da imagem (onde o lote foi posicionado)
 * para garantir alta precisão e evitar ruídos nas pontas da etiqueta.
 */
function comprimirERecortarImagem(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Definimos uma proporção de corte focando na região central horizontal (onde o guia aponta)
        const cropX = img.width * 0.12;      // Remove 12% da esquerda
        const cropY = img.height * 0.30;     // Foca no terço central superior/médio da altura
        const cropWidth = img.width * 0.76;  // Pega 76% da largura central
        const cropHeight = img.height * 0.40; // Pega uma faixa de 40% de altura

        // Limita o tamanho máximo para otimizar o desempenho no celular
        const MAX_SIZE = 1000;
        let targetWidth = cropWidth;
        let targetHeight = cropHeight;

        if (targetWidth > MAX_SIZE) {
          targetHeight = Math.round((targetHeight * MAX_SIZE) / targetWidth);
          targetWidth = MAX_SIZE;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Desenha apenas a área recortada no canvas redimensionado
        ctx.drawImage(
          img, 
          cropX, cropY, cropWidth, cropHeight, // Origem (recorte na foto real)
          0, 0, targetWidth, targetHeight     // Destino (tamanho final otimizado)
        );

        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', 0.90); // 90% de qualidade para preservar os números
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
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

  // Aplica o recorte inteligente guiado e a compressão antes de rodar o OCR
  const imagemOtimizada = await comprimirERecortarImagem(file);

  const result = await window.Tesseract.recognize(imagemOtimizada, 'por+eng', {
    logger: m => onProgress?.(m)
  });
  return result.data.text || '';
}