// Extrai o código do lote do texto do OCR por palavra-chave ou por padrão estruturado.

const KEYWORD = /(^|[^A-Z0-9])(L[O0]TE|L[O0]T|BATCH|L\.?|LT|RTM|N[º°]?\s*(?:DE\s*)?LOTE|N[UÚ]MERO\s*(?:D[EO])?\s*LOTE|LOT\s*NO\.?|BATCH\s*NO\.?|TRACE\s*CODE|O\.?P\.?[\/]?L[O0]TE?|O\.?P\.?)(?![A-Z0-9])/gi;

const LABEL_SUFFIX = /^\s*(?:N[º°]|NO\b|N\.|NUM(?:BER|ERO)?\b|DE|DO|FAB(?:RICAC[AÃ]O)?|FABRICANTE)?[\s:;.#=\-–—/]*/i;

const TOKEN = /^([A-Z0-9][A-Z0-9._\-\s]*[A-Z0-9])/i;

const DATE_STRICT = /^(\d{1,2}[./-]\d{1,4}|\d{1,4}[./-]\d{1,2}|\d{2}[./-]\d{2}[./-]\d{2,4})$/;

function readToken(rest) {
  const cleanedRest = rest.replace(LABEL_SUFFIX, '').trim();
  const m = cleanedRest.match(TOKEN);
  if (!m) return '';
  
  const token = m[1].replace(/[._-\s]+$/, '').trim();
  if (token.length < 2 || token.length > 35 || !/\d/.test(token)) return '';
  if (DATE_STRICT.test(token)) return '';

  return token.toUpperCase();
}

/**
 * @param {string} text Texto bruto do OCR.
 * @returns {string} Lote encontrado ou '' se inconclusivo.
 */
function extractLot(text) {
  const normalizedText = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lines = normalizedText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  // 1. TENTATIVA POR PALAVRA-CHAVE
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const m of line.matchAll(KEYWORD)) {
      if (/VALIDADE|FABRICACAO|FAB|VENCIMENTO/i.test(line)) continue;

      const rest = line.slice(m.index + m[0].length);
      const sameLine = readToken(rest);
      if (sameLine) return sameLine;

      if (lines[i + 1]) {
        const nextLine = lines[i + 1];
        if (!/VALIDADE|FABRICACAO|FAB|VENCIMENTO/i.test(nextLine)) {
          const validNext = readToken(nextLine);
          if (validNext) return validNext;
        }
      }
    }
  }

  // 2. TENTATIVA POR PADRÃO ESTRUTURAL (Fallback para lotes alfanuméricos complexos, ex: GMG 067.06.26)
  for (const line of lines) {
    if (/VALIDADE|FABRICACAO|FAB|VENCIMENTO|PESO|BRUTO|LIQUIDO|LAUDO|CODIGO|CNPJ|CEP/i.test(line)) {
      continue;
    }
    
    const matchPattern = line.match(/\b([A-Z]{2,4}\s*\d{2,4}[.\-]\d{2}[.\-]\d{2,4})\b/i);
    if (matchPattern && matchPattern[1]) {
      const cleanCode = matchPattern[1].trim().toUpperCase();
      if (!DATE_STRICT.test(cleanCode)) {
        return cleanCode;
      }
    }
  }

  // 3. TENTATIVA POR SEQUÊNCIA NUMÉRICA PURA (Fallback para lotes longos como 5000556834 da Micron)
  for (const line of lines) {
    // Procura linhas que contenham números grandes isolados (entre 6 e 15 dígitos) que não sejam pesos ou datas
    if (/PESO|BRUTO|LIQUIDO|VALOR|DATA|VALIDADE|FAB/i.test(line)) continue;
    
    const matchNumeric = line.match(/\b(\d{7,15})\b/);
    if (matchNumeric && matchNumeric[1]) {
      return matchNumeric[1];
    }
  }

  return '';
}