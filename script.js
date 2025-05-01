const MAX_HISTORY_ITEMS = 20; // New
const MAX_HISTORY_SIZE = 5 * 1024 * 1024; // 5MB limit for localStorage

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const apiKeyInput = document.getElementById('api-key');
    const apiUrlInput = document.getElementById('api-url');
    const saveKeyButton = document.getElementById('save-key-button');
    const keyStatus = document.getElementById('key-status');
    const modelSelect = document.getElementById('model'); // New
    const promptInput = document.getElementById('prompt');
    const sizeSelect = document.getElementById('size');
    const qualitySelect = document.getElementById('quality');
    const nInput = document.getElementById('n'); // New
    const generateButton = document.getElementById('generate-button');
    const statusMessage = document.getElementById('status-message');
    const imageResultDiv = document.getElementById('image-result');
    const gallery = document.getElementById('gallery'); // New

    // Model Specific Option Containers & Controls
    const dalle3OptionsDiv = document.getElementById('dalle3-options'); // New
    const styleSelect = document.getElementById('style'); // Moved inside dalle3OptionsDiv in HTML, but reference is fine

    const gptImage1OptionsDiv = document.getElementById('gpt-image-1-options'); // New
    const backgroundSelect = document.getElementById('background'); // New
    const moderationSelect = document.getElementById('moderation'); // New
    const outputFormatSelect = document.getElementById('output_format'); // New
    const outputCompressionInput = document.getElementById('output_compression'); // New

    const OPENAI_API_KEY_NAME = 'openai_api_key';
    const OPENAI_API_ENDPOINT = 'https://openai-mustafa-uaenorth.openai.azure.com/openai/deployments/gpt-image-1/images/generations?api-version=2025-04-01-preview';

    let uploadedimages = []; // New: Array to hold uploaded images
    let uploadedmask = null; // New: Variable to hold uploaded mask

    // Modal functionality
    const modal = document.getElementById('settings-modal');
    const settingsButton = document.getElementById('model-settings');
    const closeButton = document.getElementsByClassName('close-button')[0];

    // Open modal when settings button is clicked
    settingsButton.onclick = function() {
        modal.style.display = "block";
    }

    // Close modal when X is clicked
    closeButton.onclick = function() {
        modal.style.display = "none";
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Tab Switching Logic
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            

            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            if(tabId === 'edit'){
                document.getElementById('uploadlabel').style.display = 'block'; // Show image upload for edit tab
                document.getElementById('masklabel').style.display = 'none'; // Show mask upload for edit tab
            }
            else{
                document.getElementById('uploadlabel').style.display = 'none'; // Hide image upload for other tabs
                document.getElementById('masklabel').style.display = 'none';
            }
        });
    });

    // Image Upload Preview Logic
    const imageUpload = document.getElementById('image-upload');
    const maskUpload = document.getElementById('mask-upload'); // New: Mask upload input
    const editButton = document.getElementById('edit-button');

    imageUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadedimages = Array.from(e.target.files); // Store the actual File objects
            document.getElementById('uploadlabel').innerHTML = uploadedimages.length + " Image(s) selected";
            document.getElementById('uploadlabel').setAttribute("title", uploadedimages.map(file => file.name).join(", ")); // Show file names on hover
            if(uploadedimages.length == 1){
                document.getElementById('masklabel').disabled = false; 
            }
        } else {
            uploadedimages = []; // Clear if no files selected
            document.getElementById('uploadlabel').innerHTML = "+ Add Image(s)";
            document.getElementById('masklabel').disabled = true; 
        }
    });

    maskUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const maskFile = e.target.files[0]; // Store the actual File object
            uploadedmask = maskFile; // Store the mask file
            document.getElementById('masklabel').innerHTML = " + 1 mask added";
            document.getElementById('masklabel').setAttribute("title", maskFile.name); // Show file name on hover
        } else {
            document.getElementById('masklabel').innerHTML = "+ Add Mask";
        }
    });

    

    // --- Model Parameter Definitions ---
    const modelOptions = {
        "gpt-image-1": {
            sizes: ["auto", "1024x1024", "1536x1024", "1024x1536"],
            qualities: ["auto", "high", "medium", "low"],
            maxN: 10,
            supportsStyle: false,
            supportsBackground: true,
            supportsModeration: true,
            supportsOutputFormat: true,
            supportsOutputCompression: true, // Depends on output_format
            responseFormat: 'b64_json' // Implicitly b64
        },
        "dall-e-3": {
            sizes: ["1024x1024", "1792x1024", "1024x1792"],
            qualities: ["standard", "hd"],
            maxN: 1,
            supportsStyle: true,
            supportsBackground: false,
            supportsModeration: false,
            supportsOutputFormat: false,
            supportsOutputCompression: false,
            responseFormat: 'url'
        },
        "dall-e-2": {
            sizes: ["256x256", "512x512", "1024x1024"],
            qualities: ["standard"],
            maxN: 10,
            supportsStyle: false,
            supportsBackground: false,
            supportsModeration: false,
            supportsOutputFormat: false,
            supportsOutputCompression: false,
            responseFormat: 'url'
        }
    };

    // --- UI Update Function ---
    function updateOptionsUI(selectedModel) {
        console.log(`Updating UI for model: ${selectedModel}`);
        const options = modelOptions[selectedModel];
        if (!options) {
            console.error("Invalid model selected");
            return;
        }

        // Populate Size Dropdown
        sizeSelect.innerHTML = ''; // Clear existing options
        options.sizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size === 'auto' ? 'Auto' : size;
            sizeSelect.appendChild(option);
        });
        // Set default or preserve selection if possible
        sizeSelect.value = options.sizes.includes(sizeSelect.value) ? sizeSelect.value : options.sizes[0];

        // Populate Quality Dropdown
        const qualityContainer = qualitySelect.closest('div'); // Get the parent div
        if (selectedModel === 'dall-e-2') {
            qualityContainer.style.display = 'none'; // Hide for DALL-E 2
        } else {
            qualityContainer.style.display = 'block'; // Show for others
            qualitySelect.innerHTML = ''; // Clear existing options
            options.qualities.forEach(quality => {
                const option = document.createElement('option');
                option.value = quality;
                option.textContent = quality.charAt(0).toUpperCase() + quality.slice(1); // Capitalize
                qualitySelect.appendChild(option);
            });
            // Set default or preserve selection if possible
            qualitySelect.value = options.qualities.includes(qualitySelect.value) ? qualitySelect.value : options.qualities[0];
        }

        // Populate N Dropdown
        const nSelect = nInput; // Re-using the variable name, but it's the select element now
        const currentNValue = parseInt(nSelect.value); // Store current value before clearing
        nSelect.innerHTML = ''; // Clear existing options
        for (let i = 1; i <= options.maxN; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            nSelect.appendChild(option);
        }
        // Try to restore previous selection if valid, otherwise default to 1
        if (currentNValue >= 1 && currentNValue <= options.maxN) {
            nSelect.value = currentNValue;
        } else {
            nSelect.value = 1;
        }
        nSelect.disabled = options.maxN === 1; // Disable dropdown if only 1 option

        // Show/Hide Model Specific Sections
        dalle3OptionsDiv.style.display = options.supportsStyle ? 'block' : 'none';
        // Show/Hide GPT-Image-1 specific options individually
        const gptImage1Options = document.querySelectorAll('.gpt-image-1-option');
        const showGpt1Options = selectedModel === 'gpt-image-1';
        gptImage1Options.forEach(el => {
            el.style.display = showGpt1Options ? 'block' : 'none';
        });

        // If showing GPT-1 options, handle compression input visibility/disable state
        if (showGpt1Options) {
            const compressionEnabled = options.supportsOutputCompression && ['jpeg', 'webp'].includes(outputFormatSelect.value);
            outputCompressionInput.disabled = !compressionEnabled;
        }
    }

    // --- Event Listeners ---
    // Update UI when model changes
    modelSelect.addEventListener('change', (e) => {
        updateOptionsUI(e.target.value);
    });

    // Update compression enable/disable when output format changes (only if gpt-image-1 is active)
    outputFormatSelect.addEventListener('change', (e) => {
        if (modelSelect.value === 'gpt-image-1') {
            const compressionEnabled = ['jpeg', 'webp'].includes(e.target.value);
            outputCompressionInput.disabled = !compressionEnabled;
        }
    });

    // --- API Key Handling ---
    function loadApiKey() {
        const savedKey = localStorage.getItem(OPENAI_API_KEY_NAME);
        const savedUrl = localStorage.getItem(OPENAI_API_ENDPOINT);
        if (savedKey) {
            apiKeyInput.value = savedKey;
            apiUrlInput.value = savedUrl;
            keyStatus.textContent = 'Status: Key loaded from localStorage.';
            keyStatus.style.color = 'green';
        } else {
            keyStatus.textContent = 'Status: No key saved. Please enter your key.';
            keyStatus.style.color = 'red';
        }
    }

    function saveApiKey() {
        const apiKey = apiKeyInput.value.trim();
        const apiUrl = apiUrlInput.value.trim();
        if (apiKey) {
            localStorage.setItem(OPENAI_API_KEY_NAME, apiKey);
            localStorage.setItem(OPENAI_API_ENDPOINT, apiUrl);
            keyStatus.textContent = 'Status: Key saved successfully!';
            keyStatus.style.color = 'green';
            console.log('API Key saved to localStorage.');
            
        } else {
            localStorage.removeItem(OPENAI_API_KEY_NAME);
            localStorage.removeItem(OPENAI_API_ENDPOINT);
            keyStatus.textContent = 'Status: API Key field is empty. Key removed.';
            keyStatus.style.color = 'orange';
            console.log('API Key removed from localStorage.');
        }
        modal.style.display = "none";
    }

    // Event listener for the save button
    saveKeyButton.addEventListener('click', saveApiKey);

    // Load the API key when the page loads
    loadApiKey();

    // Initialize UI based on default model selection
    updateOptionsUI(modelSelect.value);

    // --- Image Generation Logic (to be added next) ---
    generateButton.addEventListener('click', async () => {
        const apiKey = localStorage.getItem(OPENAI_API_KEY_NAME);
        const apiUrl = localStorage.getItem(OPENAI_API_ENDPOINT); // New: Load API URL
        const selectedModel = modelSelect.value;
        const modelConfig = modelOptions[selectedModel];
        const prompt = promptInput.value.trim();
        const inputimage = document.getElementById('image-upload').files[0]; // New: Get uploaded image

        // --- Input Validation ---
        if (!apiKey) {
            statusMessage.textContent = 'Error: API Key not found. Please save your key first.';
            statusMessage.style.color = 'red';
            return;
        }
        if (!prompt) {
            statusMessage.textContent = 'Error: Please enter a prompt.';
            statusMessage.style.color = 'red';
            return;
        }
        if (!modelConfig) {
            statusMessage.textContent = 'Error: Invalid model selected.';
            statusMessage.style.color = 'red';
            return;
        }

        // --- Prepare for API Call ---
        statusMessage.textContent = 'Generating image(s)... Please wait.';
        statusMessage.style.color = 'blue';
        imageResultDiv.innerHTML = ''; // Clear previous images
        generateButton.disabled = true;
        generateButton.textContent = 'Generating...';

        // --- Construct API Request Body Dynamically ---
        const requestBody = {
            model: selectedModel,
            prompt: prompt,
            n: parseInt(nInput.value) || 1, // Common parameter
        };

        // --- Add Model-Specific Parameters ---
        if (selectedModel === 'dall-e-3') {
            // DALL-E 3 requires size, quality, style. n is always 1 (handled by UI).
            requestBody.size = sizeSelect.value;
            requestBody.quality = qualitySelect.value;
            requestBody.style = styleSelect.value;
            // response_format defaults to 'url', which is fine.
        } else if (selectedModel === 'dall-e-2') {
            // DALL-E 2 requires size. n can be > 1.
            requestBody.size = sizeSelect.value;
            // quality is not applicable. response_format defaults to 'url'.
        } else if (selectedModel === 'gpt-image-1') {
            // gpt-image-1 has many optional parameters.
            // Size is optional (defaults to auto)
            if (sizeSelect.value !== 'auto') {
                requestBody.size = sizeSelect.value;
            }
            // Quality is optional (defaults to auto)
            if (qualitySelect.value !== 'auto') {
                requestBody.quality = qualitySelect.value;
            }
            // Background is optional (defaults to auto)
            if (backgroundSelect.value !== 'auto') {
                requestBody.background = backgroundSelect.value;
            }
            // Moderation is optional (defaults to auto)
            if (moderationSelect.value !== 'auto') {
                requestBody.moderation = moderationSelect.value;
            }
            // Output format is optional (defaults to png)
            if (outputFormatSelect.value !== 'png') {
                requestBody.output_format = outputFormatSelect.value;
                // Compression only applies if format is jpeg/webp
                if (['jpeg', 'webp'].includes(requestBody.output_format)) {
                    requestBody.output_compression = parseInt(outputCompressionInput.value);
                }
            }
            if (uploadedimages.length > 0) {
                requestBody.image = uploadedimages; // New: Add uploaded images to request body
            }
            // response_format is implicitly b64_json.
        }

        console.log('Sending request to OpenAI:', JSON.stringify(requestBody, null, 2));
        
        gallery.innerHTML = `
        <div class="gallery-item" data-id="">
            <div class="gradient-background"></div>
            <div class="prompt">${prompt}</div>
            <div class="timestamp">...</div>
        </div>
    `+ gallery.innerHTML; // Prepend new item to gallery
        
        
        try {
            response = null; // Reset response variable
            if(uploadedimages.length > 0){
                const formData = new FormData();
                formData.append('model', selectedModel);
                formData.append('prompt', prompt);
                formData.append('n', parseInt(nInput.value) || 1);
                uploadedimages.forEach((file, index) => {
                    formData.append('image[]', file); // Send the File object directly
                });
                formData.append('size', sizeSelect.value);
                formData.append('quality', qualitySelect.value);
                formData.append('background', backgroundSelect.value);
                formData.append('moderation', moderationSelect.value);
                formData.append('output_format', outputFormatSelect.value);
                formData.append('output_compression', parseInt(outputCompressionInput.value) || 0);

                response = await fetch(apiUrl.replace("generations","edits"), {
                    method: 'POST',
                    headers: {
                        'api-key': apiKey, // For Azure OpenAI
                    },
                    body: formData
                });

            }else{
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': apiKey, // For Azure OpenAI
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });
            }

            const data = await response.json();
            console.log('Received response from OpenAI:', data);

            if (!response.ok) {
                const errorMessage = data.error?.message || `HTTP error! Status: ${response.status}`;
                throw new Error(errorMessage);
            }

            if (data.data && data.data.length > 0) {
                // Determine expected format for processing
                const expectedFormat = modelConfig.responseFormat; // 'url' or 'b64_json'

                data.data.forEach((item, index) => {
                    const imgElement = document.createElement('img');
                    imgElement.alt = `Generated image ${index + 1} for: ${prompt}`;

                    if (expectedFormat === 'url' && item.url) {
                        imgElement.src = item.url;
                        saveToHistory(item.url, prompt) // Save to history
                    } else if (expectedFormat === 'b64_json' && item.b64_json) {
                        // For b64, determine the image type from the user's selection (or default)
                        const imageType = requestBody.output_format || 'png'; // Use selected format, default to png
                        const imageData = `data:image/${imageType};base64,${item.b64_json}`;
                        imgElement.src = imageData;
                        saveToHistory(imageData, prompt); // Save to history
                    } else {
                        console.warn(`Item ${index} in response did not contain expected data format (${expectedFormat})`);
                        return; // Skip this item
                    }
                    imageResultDiv.appendChild(imgElement);
                });

                statusMessage.textContent = `Image(s) generated successfully! (${data.data.length} image${data.data.length > 1 ? 's' : ''})`;
                statusMessage.style.color = 'green';

            } else {
                throw new Error('API response did not contain image data.');
            }

        } catch (error) {
            console.error('Error generating image:', error);
            let displayErrorMessage = `Error: ${error.message}`;
            // Check for common indicators of potential billing/input errors (like the 400 Bad Request we saw)
            if (error.message.includes('Error in request') || error.message.includes('check your input') || error.message.includes('400')) {
                displayErrorMessage += '\n\n(This might be due to insufficient credits or account limits. Check your balance: https://platform.openai.com/settings/organization/billing/overview)';
            }
            statusMessage.textContent = displayErrorMessage;
            statusMessage.style.color = 'red';
        } finally {
            // --- Reset UI State ---
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Image';
        }
    });

    // Initialize gallery on page load
    updateGallery();
}); // End DOMContentLoaded

// Function to save image to history
async function saveToHistory(imageData, prompt) {
    try {
        const newItem = {
            id: Date.now(),
            imageData,
            prompt,
            timestamp: new Date().toISOString(),
            model: document.getElementById('model').value
        };

        await ImageDB.saveImage(newItem);
        await updateGallery();
    } catch (error) {
        console.error('Failed to save to history:', error);
        const statusMessage = document.getElementById('status-message');
        statusMessage.textContent = 'Warning: Could not save to history';
        statusMessage.style.color = 'orange';
    }
}

// Function to display the gallery
async function updateGallery() {
    try {
        const gallery = document.getElementById('gallery');
        const history = await ImageDB.getAllImages();

        gallery.innerHTML = history.map(item => `
            <div class="gallery-item" data-id="${item.id}">
                <div class="timestamp">
                    <button class="smallbutton" title="Delete" onclick="deleteHistoryItem(${item.id})">❌</button> 
                    <button class="smallbutton" title="Download" onclick="downloadHistoryItem(${item.id})">⬇️</button>
                </div>
                <img src="${item.imageData}" alt="${item.prompt}" 
                     onclick="showInMainView('${item.imageData}', '${item.prompt}')">
                <div class="prompt">${item.prompt}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to update gallery:', error);
    }
}

// Function to show image in main view
function showInMainView(imageData, prompt) {
    
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    
    modal.style.display = "block";
    modalImg.src = imageData;
    modalImg.alt = prompt; // Set alt text for accessibility
    modalCaption.innerHTML = prompt

}

// Function to delete history item
async function deleteHistoryItem(id) {
    try {
        await ImageDB.deleteImage(id);
        await updateGallery();
    } catch (error) {
        console.error('Failed to delete item:', error);
    }
}

// Function to download history item
async function downloadHistoryItem(id) {
    try {
        const history = await ImageDB.getAllImages();
        const item = history.find(item => item.id === id);
        if (item) {
            const link = document.createElement('a');
            link.href = item.imageData;
            link.download = `generated_image_${id}.png`; // Change extension based on format if needed
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Failed to download item:', error);
    }
}

// Function to handle generated image
function handleGeneratedImage(imageData) {
    const prompt = document.getElementById('prompt').value;
    const imageResult = document.getElementById('image-result');
    // imageResult.innerHTML = `<img src="${imageData}" alt="${prompt}">`;
    imageResult.innerHTML = ``;
    saveToHistory(imageData, prompt);
}


// Close modal when clicking the x
document.querySelector('.modal-close').onclick = function() {
    document.getElementById('imageModal').style.display = "none";
}

// Close modal when clicking outside the image
document.getElementById('imageModal').onclick = function(e) {
    if (e.target === this) {
        this.style.display = "none";
    }
}
