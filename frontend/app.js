const form = document.getElementById('uploadForm');
const statusDiv = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');
const videoInput = document.getElementById('video');
const fileLabel = document.getElementById('fileLabel');
const fileName = document.getElementById('fileName');

// Manejar selección de archivo
videoInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    const file = e.target.files[0];
    fileName.textContent = `✓ ${file.name}`;
    fileLabel.classList.add('has-file');
    fileLabel.innerHTML = '<span>✓ Video seleccionado</span>';
  } else {
    fileName.textContent = '';
    fileLabel.classList.remove('has-file');
    fileLabel.innerHTML = '<span>📁 Seleccionar video</span>';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const caption = document.getElementById('caption').value;
  const file = videoInput.files[0];

  if (!file) {
    showStatus('error', '❌ Por favor selecciona un video');
    return;
  }

  // Deshabilitar botón
  submitBtn.disabled = true;
  submitBtn.textContent = 'Subiendo...';
  showStatus('loading', '⏳ Subiendo reel a Instagram...');

  try {
    // Paso 1: Crear/actualizar cuenta
    const accountRes = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const accountData = await accountRes.json();
    
    if (!accountData.ok) {
      throw new Error('Error al guardar la cuenta');
    }

    // Paso 2: Subir el reel
    const formData = new FormData();
    formData.append('video', file);
    formData.append('account_id', accountData.account.id);
    formData.append('caption', caption);

    const uploadRes = await fetch('/api/upload-now', {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (uploadData.error) {
      throw new Error(uploadData.error);
    }

    if (uploadData.success) {
      showStatus('success', '✅ ¡Reel subido exitosamente a Instagram!');
      form.reset();
      fileName.textContent = '';
      fileLabel.classList.remove('has-file');
      fileLabel.innerHTML = '<span>📁 Seleccionar video</span>';
    } else {
      throw new Error(uploadData.message || 'Error desconocido al subir el reel');
    }

  } catch (error) {
    showStatus('error', `❌ Error: ${error.message}`);
    console.error('Error completo:', error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '🚀 Subir Reel Ahora';
  }
});

function showStatus(type, message) {
  statusDiv.className = `status ${type}`;
  
  if (type === 'loading') {
    statusDiv.innerHTML = `<span class="spinner"></span>${message}`;
  } else {
    statusDiv.textContent = message;
  }

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}