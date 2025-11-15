// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const previewSection = document.getElementById('previewSection');
const originalPreview = document.getElementById('originalPreview');
const convertedPreview = document.getElementById('convertedPreview');
const originalInfo = document.getElementById('originalInfo');
const convertedInfo = document.getElementById('convertedInfo');
const formatSelect = document.getElementById('formatSelect');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const qualityControl = document.getElementById('qualityControl');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

let currentFile = null;
let convertedBlob = null;

// Event Listeners
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('click', () => fileInput.click());

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Format change handler
formatSelect.addEventListener('change', () => {
    const selectedFormat = formatSelect.value;
    // Show quality control for JPEG and WebP
    if (selectedFormat === 'image/jpeg' || selectedFormat === 'image/webp') {
        qualityControl.style.display = 'flex';
    } else {
        qualityControl.style.display = 'none';
    }
    // Reset converted preview
    convertedPreview.src = '';
    convertedInfo.textContent = '';
    downloadBtn.style.display = 'none';
    convertedBlob = null;
});

// Quality slider
qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value;
});

// Convert button
convertBtn.addEventListener('click', convertImage);

// Download button
downloadBtn.addEventListener('click', downloadImage);

// Reset button
resetBtn.addEventListener('click', resetConverter);

// File handling
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    currentFile = file;
    const reader = new FileReader();

    reader.onload = (e) => {
        originalPreview.src = e.target.result;
        originalInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
        previewSection.style.display = 'block';
        
        // Set default format based on file type
        const fileType = file.type;
        if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
            formatSelect.value = 'image/png';
        } else if (fileType === 'image/png') {
            formatSelect.value = 'image/jpeg';
        } else {
            formatSelect.value = 'image/jpeg';
        }
        
        // Show/hide quality control
        formatSelect.dispatchEvent(new Event('change'));
        
        // Reset converted preview
        convertedPreview.src = '';
        convertedInfo.textContent = '';
        downloadBtn.style.display = 'none';
        convertedBlob = null;
    };

    reader.readAsDataURL(file);
}

function convertImage() {
    if (!currentFile) {
        alert('Please select an image first.');
        return;
    }

    const selectedFormat = formatSelect.value;
    const quality = selectedFormat === 'image/jpeg' || selectedFormat === 'image/webp' 
        ? parseFloat(qualitySlider.value) / 100 
        : 1.0;

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to selected format
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    convertedBlob = blob;
                    const url = URL.createObjectURL(blob);
                    convertedPreview.src = url;
                    convertedInfo.textContent = `Converted (${formatFileSize(blob.size)})`;
                    downloadBtn.style.display = 'block';
                    
                    // Update button text
                    convertBtn.textContent = 'Convert Again';
                } else {
                    alert('Conversion failed. Please try again.');
                }
            },
            selectedFormat,
            quality
        );
    };

    img.onerror = () => {
        alert('Error loading image. Please try again.');
    };

    img.src = originalPreview.src;
}

function downloadImage() {
    if (!convertedBlob) {
        alert('Please convert the image first.');
        return;
    }

    const selectedFormat = formatSelect.value;
    const extension = getExtensionFromMimeType(selectedFormat);
    const fileName = currentFile.name.replace(/\.[^/.]+$/, '') + '.' + extension;
    
    const url = URL.createObjectURL(convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function resetConverter() {
    currentFile = null;
    convertedBlob = null;
    fileInput.value = '';
    originalPreview.src = '';
    convertedPreview.src = '';
    originalInfo.textContent = '';
    convertedInfo.textContent = '';
    previewSection.style.display = 'none';
    downloadBtn.style.display = 'none';
    convertBtn.textContent = 'Convert Image';
    formatSelect.value = 'image/jpeg';
    qualitySlider.value = 90;
    qualityValue.textContent = '90';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/bmp': 'bmp'
    };
    return mimeToExt[mimeType] || 'jpg';
}

