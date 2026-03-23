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
  if (!['csv', 'docx', 'pdf'].includes(ext)) {
    alert('Only .csv, .docx, and .pdf files are accepted');
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

  // Animate steps
  activateStep('step-extract');

  try {
    // Simulate step progression (actual processing is server-side)
    setTimeout(() => { completeStep('step-extract'); activateStep('step-analyze'); }, 800);
    setTimeout(() => { completeStep('step-analyze'); activateStep('step-themes'); }, 2000);
    setTimeout(() => { completeStep('step-themes'); activateStep('step-done'); }, 3000);

    const result = await API.uploadFile(selectedFile, sourceSelect.value);

    // Complete all steps
    ['step-extract', 'step-analyze', 'step-themes', 'step-done'].forEach(completeStep);

    setTimeout(() => {
      processingStatus.style.display = 'none';
      uploadResult.style.display = 'block';
      resultIcon.textContent = 'check_circle';
      resultIcon.className = 'material-icons-outlined result-icon success';
      resultText.textContent = result.message || `Imported ${result.itemCount} items`;
      loadImportHistory();
    }, 500);

  } catch (err) {
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

// ===== Init =====
loadImportHistory();
