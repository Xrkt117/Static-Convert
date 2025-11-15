// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const uploadContainer = document.getElementById('uploadContainer');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const previewSection = document.getElementById('previewSection');
const imagesGrid = document.getElementById('imagesGrid');
const formatSelect = document.getElementById('formatSelect');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const qualityControl = document.getElementById('qualityControl');
const convertAllBtn = document.getElementById('convertAllBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const resetBtn = document.getElementById('resetBtn');
const themeToggle = document.getElementById('themeToggle');
const errorMessage = document.getElementById('errorMessage');

let imageFiles = []; // Array to store all uploaded files
let imageData = []; // Array to store image data (preview, converted blob, etc.)

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

themeToggle.addEventListener('click', toggleTheme);
initTheme();

// Event Listeners
browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelect);

uploadArea.addEventListener('click', (e) => {
    if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
        fileInput.click();
    }
});

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
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        handleFiles(files);
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
    
    // Reset all converted images
    imageData.forEach((data, index) => {
        if (data.convertedBlob) {
            resetConvertedImage(index);
        }
    });
    
    updateDownloadAllButton();
});

// Quality slider
qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value;
});

// Convert All button
convertAllBtn.addEventListener('click', convertAllImages);

// Download All button
downloadAllBtn.addEventListener('click', downloadAllImages);

// Reset button
resetBtn.addEventListener('click', resetConverter);

// Error handling
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// File handling
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        handleFiles(files);
    }
}

function handleFiles(files) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    const validFiles = files.filter(file => {
        const isValidType = file.type.startsWith('image/') || validTypes.includes(file.type);
        if (!isValidType) {
            showError(`Skipped ${file.name}: Invalid file type.`);
        }
        return isValidType;
    });
    
    if (validFiles.length === 0) {
        showError('No valid image files selected.');
        return;
    }
    
    // Check total limit (6 images max)
    const totalAfterAdd = imageFiles.length + validFiles.length;
    if (totalAfterAdd > 6) {
        const allowed = 6 - imageFiles.length;
        if (allowed <= 0) {
            showError('Maximum of 6 images allowed. Please remove some images first.');
            return;
        }
        showError(`Maximum of 6 images allowed. Only the first ${allowed} image(s) will be added.`);
        validFiles.splice(allowed);
    }
    
    // Add new files to existing ones
    imageFiles = [...imageFiles, ...validFiles];
    
    // Process each file
    validFiles.forEach((file, index) => {
        const globalIndex = imageFiles.length - validFiles.length + index;
        processFile(file, globalIndex);
    });
    
    // Show preview section and hide upload area
    if (imageFiles.length > 0) {
        previewSection.style.display = 'block';
        uploadContainer.style.display = 'none';
    }
    
    // Set default format
    const firstFileType = imageFiles[0].type;
    if (firstFileType === 'image/jpeg' || firstFileType === 'image/jpg') {
        formatSelect.value = 'image/png';
    } else if (firstFileType === 'image/png') {
        formatSelect.value = 'image/jpeg';
    } else {
        formatSelect.value = 'image/jpeg';
    }
    formatSelect.dispatchEvent(new Event('change'));
}

function processFile(file, index) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        const imageDataUrl = e.target.result; // Store the data URL
        
        img.onload = () => {
            // Create image data object - ensure we store the file reference and data URL correctly
            const data = {
                file: file,
                originalSrc: imageDataUrl, // Use the stored data URL
                originalWidth: img.width,
                originalHeight: img.height,
                convertedBlob: null,
                convertedSrc: null,
                convertedWidth: null,
                convertedHeight: null,
                isConverting: false
            };
            
            // Ensure we're setting the data at the correct index
            // If index is beyond array length, push; otherwise set at index
            while (imageData.length <= index) {
                imageData.push(null);
            }
            imageData[index] = data;
            
            // Create or update image card
            createImageCard(index, data);
        };
        
        img.onerror = () => {
            showError(`Failed to load ${file.name}. The file might be corrupted.`);
        };
        
        img.src = imageDataUrl;
    };
    
    reader.onerror = () => {
        showError(`Failed to read ${file.name}. Please try again.`);
    };
    
    reader.readAsDataURL(file);
}

function createImageCard(index, data) {
    let card = document.getElementById(`image-card-${index}`);
    
    if (!card) {
        card = document.createElement('div');
        card.className = 'image-card';
        card.id = `image-card-${index}`;
        imagesGrid.appendChild(card);
    }
    
    card.innerHTML = `
        <div class="image-card-header">
            <h4 class="image-card-title">${data.file.name}</h4>
            <button class="remove-btn" data-index="${index}" aria-label="Remove image">×</button>
        </div>
        <div class="image-card-content">
            <div class="image-preview-container">
                <div class="preview-section-original">
                    <div class="preview-label">Original</div>
                    <div class="image-preview-box">
                        <img src="${data.originalSrc}" alt="Original" class="preview-img">
                    </div>
                    <div class="image-meta-small">
                        <span>${data.originalWidth} × ${data.originalHeight}</span>
                        <span>${formatFileSize(data.file.size)}</span>
                    </div>
                </div>
                <div class="preview-section-converted">
                    <div class="preview-label">Converted</div>
                    <div class="image-preview-box">
                        <div class="loading-overlay-small" id="loading-${index}" style="display: none;">
                            <div class="spinner-small"></div>
                        </div>
                        <img id="converted-img-${index}" alt="Converted" class="preview-img" style="display: none;">
                        <div class="empty-state-small" id="placeholder-${index}">
                            <span>Not converted</span>
                        </div>
                    </div>
                    <div class="image-meta-small" id="converted-meta-${index}"></div>
                </div>
            </div>
            <div class="image-card-actions">
                <button class="action-btn-small convert-btn" data-index="${index}">
                    <span>Convert</span>
                </button>
                <button class="action-btn-small download-btn" data-index="${index}" style="display: none;">
                    <span>Download</span>
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const removeBtn = card.querySelector('.remove-btn');
    const convertBtn = card.querySelector('.convert-btn');
    const downloadBtn = card.querySelector('.download-btn');
    
    removeBtn.addEventListener('click', () => removeImage(index));
    convertBtn.addEventListener('click', () => convertImage(index));
    downloadBtn.addEventListener('click', () => downloadImage(index));
}

function removeImage(index) {
    imageFiles.splice(index, 1);
    imageData.splice(index, 1);
    
    // Rebuild the grid
    imagesGrid.innerHTML = '';
    imageData.forEach((data, i) => {
        createImageCard(i, data);
    });
    
    // If no images left, show upload area
    if (imageFiles.length === 0) {
        previewSection.style.display = 'none';
        uploadContainer.style.display = 'block';
    }
    
    updateDownloadAllButton();
}

function convertImage(index) {
    const data = imageData[index];
    if (!data) {
        showError('Image data not found.');
        return;
    }
    
    if (!data.originalSrc) {
        showError('Original image source not found.');
        return;
    }
    
    const selectedFormat = formatSelect.value;
    const quality = selectedFormat === 'image/jpeg' || selectedFormat === 'image/webp' 
        ? parseFloat(qualitySlider.value) / 100 
        : 1.0;
    
    // Show loading state
    const loadingOverlay = document.getElementById(`loading-${index}`);
    const placeholder = document.getElementById(`placeholder-${index}`);
    const convertedImg = document.getElementById(`converted-img-${index}`);
    const convertBtn = document.querySelector(`.convert-btn[data-index="${index}"]`);
    const downloadBtn = document.querySelector(`.download-btn[data-index="${index}"]`);
    
    if (!loadingOverlay || !placeholder || !convertedImg || !convertBtn) {
        showError('UI elements not found. Please try again.');
        return;
    }
    
    loadingOverlay.style.display = 'flex';
    placeholder.style.display = 'none';
    convertedImg.style.display = 'none';
    convertedImg.src = ''; // Clear previous conversion
    convertBtn.disabled = true;
    data.isConverting = true;
    
    // Clean up previous conversion if exists
    if (data.convertedSrc) {
        URL.revokeObjectURL(data.convertedSrc);
        data.convertedSrc = null;
        data.convertedBlob = null;
    }
    
    const img = new Image();
    
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // Fill with white background for formats that don't support transparency
            if (selectedFormat === 'image/jpeg' || selectedFormat === 'image/bmp') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Draw image on canvas
            ctx.drawImage(img, 0, 0);
            
            // Convert to selected format
            canvas.toBlob(
                (blob) => {
                    loadingOverlay.style.display = 'none';
                    convertBtn.disabled = false;
                    data.isConverting = false;
                    
                    if (blob) {
                        // Store the blob and create object URL
                        data.convertedBlob = blob;
                        data.convertedSrc = URL.createObjectURL(blob);
                        data.convertedWidth = img.width;
                        data.convertedHeight = img.height;
                        
                        // Update the image element - use a fresh reference
                        const currentConvertedImg = document.getElementById(`converted-img-${index}`);
                        const currentPlaceholder = document.getElementById(`placeholder-${index}`);
                        const currentMeta = document.getElementById(`converted-meta-${index}`);
                        const currentDownloadBtn = document.querySelector(`.download-btn[data-index="${index}"]`);
                        
                        if (currentConvertedImg) {
                            currentConvertedImg.onload = () => {
                                currentConvertedImg.style.display = 'block';
                                if (currentPlaceholder) {
                                    currentPlaceholder.style.display = 'none';
                                }
                            };
                            currentConvertedImg.onerror = () => {
                                if (currentPlaceholder) {
                                    currentPlaceholder.style.display = 'flex';
                                }
                                currentConvertedImg.style.display = 'none';
                            };
                            currentConvertedImg.src = data.convertedSrc;
                        }
                        
                        if (currentMeta) {
                            currentMeta.innerHTML = `
                                <span>${img.width} × ${img.height}</span>
                                <span>${formatFileSize(blob.size)}</span>
                            `;
                        }
                        
                        if (currentDownloadBtn) {
                            currentDownloadBtn.style.display = 'block';
                        }
                        
                        updateDownloadAllButton();
                    } else {
                        showError('Conversion failed. Try a different format.');
                        if (placeholder) {
                            placeholder.style.display = 'flex';
                        }
                    }
                },
                selectedFormat,
                quality
            );
        } catch (error) {
            loadingOverlay.style.display = 'none';
            convertBtn.disabled = false;
            data.isConverting = false;
            showError('Conversion error: ' + error.message);
            if (placeholder) {
                placeholder.style.display = 'flex';
            }
        }
    };
    
    img.onerror = () => {
        loadingOverlay.style.display = 'none';
        convertBtn.disabled = false;
        data.isConverting = false;
        showError('Error loading image.');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
    };
    
    // Use the original source from the data object
    img.src = data.originalSrc;
}

function convertAllImages() {
    imageData.forEach((data, index) => {
        if (!data.convertedBlob && !data.isConverting) {
            convertImage(index);
        }
    });
}

function downloadImage(index) {
    const data = imageData[index];
    if (!data || !data.convertedBlob) {
        showError('Please convert the image first.');
        return;
    }
    
    const selectedFormat = formatSelect.value;
    const extension = getExtensionFromMimeType(selectedFormat);
    const fileName = data.file.name.replace(/\.[^/.]+$/, '') + '.' + extension;
    
    const a = document.createElement('a');
    a.href = data.convertedSrc;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function downloadAllImages() {
    const convertedImages = imageData.filter(data => data.convertedBlob);
    
    if (convertedImages.length === 0) {
        showError('No converted images to download. Please convert images first.');
        return;
    }
    
    // Download each converted image
    convertedImages.forEach((data, index) => {
        setTimeout(() => {
            const originalIndex = imageData.indexOf(data);
            downloadImage(originalIndex);
        }, index * 200); // Stagger downloads to avoid browser blocking
    });
}

function resetConvertedImage(index) {
    const data = imageData[index];
    if (data) {
        if (data.convertedSrc) {
            URL.revokeObjectURL(data.convertedSrc);
        }
        data.convertedBlob = null;
        data.convertedSrc = null;
        data.convertedWidth = null;
        data.convertedHeight = null;
        
        const placeholder = document.getElementById(`placeholder-${index}`);
        const convertedImg = document.getElementById(`converted-img-${index}`);
        const downloadBtn = document.querySelector(`.download-btn[data-index="${index}"]`);
        const meta = document.getElementById(`converted-meta-${index}`);
        
        if (placeholder) placeholder.style.display = 'flex';
        if (convertedImg) convertedImg.style.display = 'none';
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (meta) meta.innerHTML = '';
    }
}

function updateDownloadAllButton() {
    const hasConverted = imageData.some(data => data.convertedBlob);
    downloadAllBtn.style.display = hasConverted ? 'block' : 'none';
}

function resetConverter() {
    // Clean up object URLs
    imageData.forEach(data => {
        if (data.convertedSrc) {
            URL.revokeObjectURL(data.convertedSrc);
        }
    });
    
    imageFiles = [];
    imageData = [];
    fileInput.value = '';
    imagesGrid.innerHTML = '';
    previewSection.style.display = 'none';
    uploadContainer.style.display = 'block';
    downloadAllBtn.style.display = 'none';
    errorMessage.style.display = 'none';
    formatSelect.value = 'image/jpeg';
    qualitySlider.value = 90;
    qualityValue.textContent = '90';
    formatSelect.dispatchEvent(new Event('change'));
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
