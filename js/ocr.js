// Envolve o Tesseract.js (carregado como script global em index.html).

function comprimirImagem(file) {
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
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1600;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
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
        }, 'image/jpeg', 0.90);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

async function recognizeText(file, onProgress) {
  if (!window.Tesseract) {
    throw new Error('Tesseract.js não foi carregado. Verifique a conexão com a internet.');
  }

  const imagemOtimizada = await comprimirImagem(file);

  const worker = await window.Tesseract.createWorker('por+eng', window.Tesseract.OEM_DEFAULT, {
    logger: m => onProgress?.(m)
  });
  
  // Usamos PSM.AUTO (modo padrão automático do Tesseract), ideal para documentos e etiquetas com tabelas/códigos de barras
  await worker.setParameters({
    tessedit_pageseg_mode: window.Tesseract.PSM.AUTO,
  });

  const ret = await worker.recognize(imagemOtimizada);

  await worker.terminate();

  const text = ret.data.text || '';

  console.log("--- TEXTO COMPLETO LIDO PELO OCR (AUTO) ---");
  console.log(text);
  console.log("------------------------------------------");

  return text;
}