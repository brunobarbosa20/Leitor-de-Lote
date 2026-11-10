// Envolve o Tesseract.js (carregado como script global em index.html).

/**
 * @param {File|Blob} file Imagem da etiqueta.
 * @param {(m: {status?: string, progress?: number}) => void} [onProgress]
 * @returns {Promise<string>} Texto bruto reconhecido (uso interno; não é exibido).
 */
async function recognizeText(file, onProgress) {
  if (!window.Tesseract) {
    throw new Error('Tesseract.js não foi carregado. Verifique a conexão com a internet.');
  }
  const result = await window.Tesseract.recognize(file, 'por+eng', {
    logger: m => onProgress?.(m)
  });
  return result.data.text || '';
}
