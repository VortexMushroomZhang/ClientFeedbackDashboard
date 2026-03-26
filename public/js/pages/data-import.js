// ===== DOM =====
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadOptions = document.getElementById('upload-options');
const selectedFilename = document.getElementById('selected-filename');
const clearFileBtn = document.getElementById('clear-file');
const uploadBtn = document.getElementById('upload-btn');
const sourceSelect = document.getElementById('source-select');
const processingStatus = document.getElementById('processing-status');
const uploadResult = document.getElementById('upload-result');
const resultIcon = document.getElementById('result-icon');
const resultText = document.getElementById('result-text');
const uploadAnother = document.getElementById('upload-another');
const importTbody = document.getElementById('import-tbody');

let selectedFile = null;

// ===== Upload Zone Events =====
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    selectFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) selectFile(fileInput.files[0]);
});

clearFileBtn.addEventListener('click', resetUpload);
uploadAnother.addEventListener('click', resetUpload);

function selectFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx', 'xls', 'docx', 'pdf'].includes(ext)) {
    alert('Only .csv, .xlsx, .xls, .docx, and .pdf files are accepted');
    return;
  }
  selectedFile = file;
  selectedFilename.textContent = file.name;
  uploadZone.style.display = 'none';
  uploadOptions.style.display = 'flex';
  uploadResult.style.display = 'none';
  processingStatus.style.display = 'none';
}

function resetUpload() {
  selectedFile = null;
  fileInput.value = '';
  uploadZone.style.display = '';
  uploadOptions.style.display = 'none';
  processingStatus.style.display = 'none';
  uploadResult.style.display = 'none';
  resetSteps();
}

// ===== Upload =====
uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  uploadOptions.style.display = 'none';
  processingStatus.style.display = 'block';
  uploadResult.style.display = 'none';
  resetSteps();
  activateStep('step-extract');

  let pollTimer = null;

  try {
    const result = await API.uploadFile(selectedFile, sourceSelect.value);
    const importId = result.importId;

    if (!importId) throw new Error(result.error || 'Upload failed');

    // Poll import status every 3s until done
    let activeStepKey = 'step-extract';

    function updateStepsFromStatus(status) {
      const s = status || '';
      if (/Analyz/i.test(s)   && activeStepKey === 'step-extract') { completeStep('step-extract'); activateStep('step-analyze'); activeStepKey = 'step-analyze'; }
      if (/Synthes/i.test(s)  && activeStepKey === 'step-analyze') { completeStep('step-analyze'); activateStep('step-themes');  activeStepKey = 'step-themes'; }
      if (/Saving|Generating/i.test(s) && activeStepKey === 'step-themes')  { completeStep('step-themes');  activateStep('step-done');    activeStepKey = 'step-done'; }

      // Show detail text inside the active step
      const detail = s.replace(/^Processing:\s*/i, '');
      const activeEl = document.querySelector('.step.active span:last-child');
      if (activeEl && detail) activeEl.textContent = detail;
    }

    pollTimer = setInterval(async () => {
      try {
        const imports = await API.getImports();
        const imp = imports.find(i => i.id === importId);
        if (!imp) return;

        updateStepsFromStatus(imp.status);

        if (imp.status === 'Completed') {
          clearInterval(pollTimer);
          ['step-extract','step-analyze','step-themes','step-done'].forEach(completeStep);
          setTimeout(() => {
            processingStatus.style.display = 'none';
            uploadResult.style.display = 'block';
            resultIcon.textContent = 'check_circle';
            resultIcon.className = 'material-icons-outlined result-icon success';
            resultText.textContent = `Imported ${imp.itemCount} feedback items successfully.`;
            loadImportHistory();
          }, 400);
        } else if (/^Failed/i.test(imp.status)) {
          clearInterval(pollTimer);
          processingStatus.style.display = 'none';
          uploadResult.style.display = 'block';
          resultIcon.textContent = 'error';
          resultIcon.className = 'material-icons-outlined result-icon error';
          resultText.textContent = imp.status;
          loadImportHistory();
        }
      } catch (_) { /* ignore poll errors */ }
    }, 3000);

  } catch (err) {
    clearInterval(pollTimer);
    processingStatus.style.display = 'none';
    uploadResult.style.display = 'block';
    resultIcon.textContent = 'error';
    resultIcon.className = 'material-icons-outlined result-icon error';
    resultText.textContent = 'Error: ' + err.message;
  }
});

function resetSteps() {
  document.querySelectorAll('.step').forEach(s => {
    s.classList.remove('active', 'done');
    s.querySelector('.step-icon').textContent = 'hourglass_empty';
  });
}

function activateStep(id) {
  const step = document.getElementById(id);
  if (step) {
    step.classList.add('active');
    step.querySelector('.step-icon').textContent = 'pending';
  }
}

function completeStep(id) {
  const step = document.getElementById(id);
  if (step) {
    step.classList.remove('active');
    step.classList.add('done');
    step.querySelector('.step-icon').textContent = 'check_circle';
  }
}

// ===== Import History =====
async function loadImportHistory() {
  try {
    const imports = await API.getImports();
    if (imports.length === 0) {
      importTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-hint);padding:24px;">No imports yet</td></tr>';
      return;
    }
    importTbody.innerHTML = imports.map(i => {
      const date = new Date(i.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const statusClass = i.status.toLowerCase();
      return `
        <tr>
          <td>${i.filename}</td>
          <td>${i.fileType.toUpperCase()}</td>
          <td>${i.itemCount}</td>
          <td><span class="import-status ${statusClass}">${i.status}</span></td>
          <td>${date}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load import history:', err);
  }
}

// ===== Re-analyze Themes =====
document.getElementById('retheme-btn').addEventListener('click', async () => {
  const btn = document.getElementById('retheme-btn');
  const statusEl = document.getElementById('retheme-status');

  if (!confirm('This will replace all current themes and action suggestions by re-clustering your existing feedback with AI. Continue?')) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-outlined">hourglass_empty</span> Re-analyzing...';
  statusEl.style.display = '';
  statusEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text-secondary);">
      <div class="processing-spinner" style="width:18px;height:18px;border-width:2px;"></div>
      Running AI theme synthesis — this may take a minute…
    </div>`;

  try {
    const res = await fetch('/api/retheme', { method: 'POST' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Re-analyze failed');

    statusEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#2e7d32;background:#e8f5e9;border-radius:var(--radius);padding:12px 16px;">
        <span class="material-icons-outlined" style="font-size:18px;">check_circle</span>
        <div>
          <strong>Done.</strong> ${data.message}
          ${data.feedbackSkipped > 0 ? `<br><span style="color:var(--text-hint)">${data.feedbackSkipped} non-constructive items archived.</span>` : ''}
        </div>
      </div>`;
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-outlined">auto_fix_high</span> Re-analyze Themes';
  } catch (err) {
    statusEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#b71c1c;background:#fce4ec;border-radius:var(--radius);padding:12px 16px;">
        <span class="material-icons-outlined" style="font-size:18px;">error</span>
        ${err.message}
      </div>`;
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-outlined">auto_fix_high</span> Re-analyze Themes';
  }
});

// ===== Init =====
loadImportHistory();
