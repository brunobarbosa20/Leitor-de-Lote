// Registro da confirmação do lote pelo funcionário.
// Guarda no localStorage do navegador e dispara o evento "lote:confirmado",
// para facilitar uma futura integração (API, planilha, sistema de estoque).

const STORAGE_KEY = 'ocr-lotes-confirmados';
const MAX_RECORDS = 500;

/**
 * @param {{lot: string, source: 'ocr'|'ocr-editado'|'manual', fileName?: string}} data
 * @returns {{record: object, persisted: boolean}}
 */
function registerConfirmation({ lot, source, fileName = '' }) {
  const record = { lot, source, fileName, confirmedAt: new Date().toISOString() };

  let persisted = true;
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    list.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_RECORDS)));
  } catch {
    persisted = false;
  }

  window.dispatchEvent(new CustomEvent('lote:confirmado', { detail: record }));
  return { record, persisted };
}
