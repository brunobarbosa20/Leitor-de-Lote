// Extrai exclusivamente o número/código do lote de um texto reconhecido por OCR.
// Módulo puro (sem DOM), fácil de testar.

// Palavras-chave expandidas cobrindo português, inglês, abreviações industriais e ordens de produção (OP).
// Aceita 0 no lugar de O (comum em OCR).
const KEYWORD = /(^|[^A-Z0-9])(L[O0]TE|L[O0]T|BATCH|L\.?|LT|FAB(?:RICAC[AÃ]O)?|RTM|LOTE\s*FAB\.?|LOTE\s*FABRICANTE|N[º°]\s*LOTE|NUMERO\s*DE\s*LOTE|LOT\s*NO\.?|BATCH\s*NO\.?|TRACE\s*CODE|O\.?P\.?)(?![A-Z0-9])/gi;

// Complementos entre a palavra-chave e o valor: "Nº", "No.", "Number", ":", "#", "-"...
const LABEL_SUFFIX = /^\s*(?:N[º°]|NO\b|N\.|NUM(?:BER|ERO)?\b|DE|FAB(?:RICAC[AÃ]O)?|FABRICANTE)?[\s:;.#=\-–—]*/i;

const TOKEN = /^([A-Z0-9][A-Z0-9._-]*)/i;
const DATE_LIKE = /^\d{1,4}[.-]\d{1,2}[.-]\d{2,4}$/;

function readToken(rest, { rejectDates = false } = {}) {
  const m = rest.replace(LABEL_SUFFIX, '').match(TOKEN);
  if (!m) return '';
  const token = m[1].replace(/[._-]+$/, '');
  // Um lote plausível tem de 2 a 30 caracteres e pelo menos um dígito.
  if (token.length < 2 || token.length > 30 || !/\d/.test(token)) return '';
  if (rejectDates && DATE_LIKE.test(token)) return '';
  return token.toUpperCase();
}

/**
 * @param {string} text Texto bruto do OCR.
 * @returns {string} Lote encontrado (maiúsculas) ou '' se a leitura não for conclusiva.
 */
function extractLot(text) {
  const lines = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const m of line.matchAll(KEYWORD)) {
      const rest = line.slice(m.index + m[0].length);

      const sameLine = readToken(rest);
      if (sameLine) return sameLine;

      // Valor na linha seguinte: só quando nada relevante vem depois da palavra-chave.
      const nothingAfter = rest.replace(LABEL_SUFFIX, '').trim() === '';
      if (nothingAfter && lines[i + 1]) {
        const nextLine = readToken(lines[i + 1], { rejectDates: true });
        if (nextLine) return nextLine;
      }
    }
  }
  return '';
}