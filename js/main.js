const $ = id => document.getElementById(id);
const els = {
  pickCamera: $('pickCamera'), pickGallery: $('pickGallery'),
  fileCamera: $('fileCamera'), fileGallery: $('fileGallery'),
  preview: $('preview'), run: $('run'), clear: $('clear'),
  status: $('status'), progress: $('progress'), bar: $('bar'),
  result: $('result'), inconclusive: $('inconclusive'),
  lotDisplay: $('lotDisplay'), lotField: $('lotField'), lot: $('lot'),
  edit: $('edit'), confirm: $('confirm'), note: $('resultNote')
};

const state = {
  file: null,
  previewUrl: null,
  busy: false,
  readId: 0,          // invalida leituras antigas ao limpar ou iniciar outra
  hasReading: false,  // já existe resultado (ou leitura inconclusiva) para mostrar
  ocrLot: '',         // lote lido pelo OCR
  lot: '',            // lote atual (OCR, editado ou manual) já aceito na tela
  mode: 'view',       // 'view' | 'edit'
  confirmed: false
};

function setStatus(text) { els.status.textContent = text; }
function setNote(text) { els.note.textContent = text; }
function setProgress(pct) {
  els.bar.style.width = `${pct}%`;
  els.progress.setAttribute('aria-valuenow', String(pct));
}

function render() {
  const editing = state.mode === 'edit';
  els.run.disabled = !state.file || state.busy;
  els.progress.setAttribute('aria-busy', String(state.busy));
  els.result.hidden = !state.hasReading;
  els.inconclusive.hidden = !(state.hasReading && !state.lot);
  els.lotDisplay.hidden = editing || !state.lot;
  els.lotDisplay.textContent = state.lot;
  els.lotField.hidden = !editing;
  els.edit.disabled = editing;
  els.confirm.disabled = state.confirmed;
}

function resetReading() {
  state.readId++;
  Object.assign(state, { busy: false, hasReading: false, ocrLot: '', lot: '', mode: 'view', confirmed: false });
  els.lot.value = '';
  setProgress(0);
  setNote('Nenhuma leitura realizada.');
  render();
}

function revokePreview() {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = null;
}

function selectFile(file) {
  if (!file) return;
  resetReading(); //[cite: 3]
  revokePreview(); //[cite: 3]
  state.file = file; //[cite: 3]
  state.previewUrl = URL.createObjectURL(file); //[cite: 3]
  els.preview.src = state.previewUrl; //[cite: 3]
  els.preview.hidden = false; //[cite: 3]
  
  // Mostra o container pai da foto no mobile
  const container = document.getElementById('previewContainer');
  if (container) container.classList.remove('hidden');

  setStatus(`Imagem selecionada: ${file.name}`); //[cite: 3]
  render(); //[cite: 3]
}

function clearAll() {
  resetReading(); //[cite: 3]
  revokePreview(); //[cite: 3]
  state.file = null; //[cite: 3]
  els.preview.removeAttribute('src'); //[cite: 3]
  els.preview.hidden = true; //[cite: 3]
  
  const container = document.getElementById('previewContainer');
  if (container) container.classList.add('hidden');

  setStatus('Aguardando uma imagem.'); //[cite: 3]
  render(); //[cite: 3]
}

async function runOcr() {
  if (!state.file || state.busy) return;
  const id = ++state.readId;
  Object.assign(state, { busy: true, hasReading: false, ocrLot: '', lot: '', mode: 'view', confirmed: false });
  els.lot.value = '';
  setNote('');
  setStatus('Carregando OCR e reconhecendo a etiqueta...');
  setProgress(2);
  render();

  try {
    const text = await recognizeText(state.file, m => {
      if (id !== state.readId) return;
      if (m.status) setStatus(m.status);
      if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100));
    });
    if (id !== state.readId) return; // usuário limpou ou trocou a imagem

    const lot = extractLot(text);
    Object.assign(state, { ocrLot: lot, lot, mode: lot ? 'view' : 'edit', hasReading: true });
    setProgress(100);
    if (lot) {
      setStatus('Leitura concluída.');
      setNote('Confira o lote na etiqueta original. Edite se necessário e confirme.');
    } else {
      setStatus('Leitura não conclusiva.');
      setNote('');
    }
  } catch (err) {
    if (id !== state.readId) return;
    console.error(err);
    setStatus('Não foi possível processar a imagem. Verifique a conexão e tente novamente.');
  } finally {
    if (id === state.readId) {
      state.busy = false;
      render();
      if (state.mode === 'edit' && state.hasReading) els.lot.focus();
    }
  }
}

function startEdit() {
  state.mode = 'edit';
  state.confirmed = false;
  els.lot.value = state.lot;
  setNote('Corrija o lote e clique em Confirmar.');
  render();
  els.lot.focus();
  els.lot.select();
}

function confirmLot() {
  const raw = state.mode === 'edit' ? els.lot.value : state.lot;
  const value = raw.replace(/\s+/g, ' ').trim();
  if (!value) {
    setNote('Informe o lote antes de confirmar.');
    els.lot.focus();
    return;
  }
  const source = !state.ocrLot ? 'manual' : value === state.ocrLot ? 'ocr' : 'ocr-editado';
  const { record, persisted } = registerConfirmation({ lot: value, source, fileName: state.file?.name });
  Object.assign(state, { lot: value, mode: 'view', confirmed: true });
  const hora = new Date(record.confirmedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  setNote(`Lote ${value} confirmado às ${hora}.` + (persisted ? '' : ' Atenção: não foi possível salvar o registro neste navegador.'));
  render();
}

function bindFileInput(input) {
  input.addEventListener('change', e => {
    const file = e.target.files?.[0] || null;
    e.target.value = ''; // permite escolher o mesmo arquivo novamente
    selectFile(file);
  });
}

els.pickCamera.addEventListener('click', () => els.fileCamera.click());
els.pickGallery.addEventListener('click', () => els.fileGallery.click());
bindFileInput(els.fileCamera);
bindFileInput(els.fileGallery);
els.run.addEventListener('click', runOcr);
els.clear.addEventListener('click', clearAll);
els.edit.addEventListener('click', startEdit);
els.confirm.addEventListener('click', confirmLot);
els.lot.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); confirmLot(); } });

render();
