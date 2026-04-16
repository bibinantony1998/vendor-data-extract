// Initial default vendors mapping
let vendors = [
    { id: '1', display: 'Anubhav Apparels Private Limited', exact: 'ANUBHAV APPARELS PVT. LTD.' },
    { id: '2', display: 'Cotton Blossom (India) Private Limited', exact: 'COTTON BLOSSOM (INDIA) PRIVATE LIMITED' },
    { id: '3', display: 'ASN', exact: 'ASN GLOBAL FZC' },
    { id: '4', display: 'Basant India Inc.', exact: 'BASANT INDIA INC.' },
    { id: '5', display: 'Fashion Channel (Pvt) Ltd', exact: 'FASHION CHANNEL (PVT) LTD' },
    { id: '6', display: 'D & J Trading Co.Ltd.', exact: 'D & J TRADING CO.LTD.' }
];

// DOM Elements
const fileInput = document.getElementById('excelFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const convertBtn = document.getElementById('convertBtn');
const vendorListContainer = document.getElementById('vendorListContainer');
const vendorCount = document.getElementById('vendorCount');
const addVendorBtn = document.getElementById('addVendorBtn');
const newDisplayInput = document.getElementById('newDisplay');
const newExactInput = document.getElementById('newExact');
const statusMessage = document.getElementById('statusMessage');

let selectedFile = null;

// File Input Handler
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        fileNameDisplay.textContent = selectedFile.name;
        fileNameDisplay.classList.add('text-blue-400', 'font-semibold');
        
        // Enable button
        convertBtn.disabled = false;
        convertBtn.classList.remove('bg-blue-600/50', 'text-gray-300', 'cursor-not-allowed');
        convertBtn.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-500', 'hover:shadow-neon');
    }
});

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.opacity = '1';
    statusMessage.style.color = isError ? '#ef4444' : '#93c5fd'; // red-500 or blue-300
    
    if (!isError) {
        setTimeout(() => { statusMessage.style.opacity = '0'; }, 5000);
    }
}

// Vendor Management Handlers
function renderVendors() {
    vendorListContainer.innerHTML = '';
    vendorCount.textContent = vendors.length;

    vendors.forEach(v => {
        const vendorEl = document.createElement('div');
        vendorEl.className = 'group flex items-center justify-between bg-gray-800/50 border border-gray-700/50 p-3 rounded-lg hover:border-gray-600 transition-colors';
        
        vendorEl.innerHTML = `
            <div class="flex-1 min-w-0 pr-4">
                <div class="font-medium text-sm truncate" title="${v.display}">${v.display}</div>
                <div class="text-xs text-gray-500 truncate" title="${v.exact}">Match: ${v.exact}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="deleteVendor('${v.id}')" class="text-gray-500 hover:text-red-400 transition-colors" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                </button>
            </div>
        `;
        vendorListContainer.appendChild(vendorEl);
    });
}

window.deleteVendor = (id) => {
    vendors = vendors.filter(v => v.id !== id);
    renderVendors();
};

addVendorBtn.addEventListener('click', () => {
    const display = newDisplayInput.value.trim();
    const exact = newExactInput.value.trim();
    
    if (display && exact) {
        vendors.push({
            id: Date.now().toString(),
            display,
            exact
        });
        newDisplayInput.value = '';
        newExactInput.value = '';
        renderVendors();
    }
});

// Initial Render
renderVendors();


// Core Conversion Logic
convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    try {
        // Extract "Month" from original filename
        let monthName = "march";
        const monthMatch = selectedFile.name.toLowerCase().match(/(january|february|march|april|may|june|july|august|september|october|november|december)/);
        if (monthMatch) {
            monthName = monthMatch[1];
        }

        let fileHandle = null;

        // 1. Ask for file save location IMMEDIATELY (requires user gesture)
        // This permanently fixes Chrome/Safari renaming security blocks
        if (window.showSaveFilePicker) {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: `${monthName}-vendor-extracts.zip`,
                types: [{
                    description: 'ZIP Archive',
                    accept: { 'application/zip': ['.zip'] },
                }],
            });
        }

        convertBtn.disabled = true;
        const originalText = convertBtn.innerHTML;
        convertBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Processing...
        `;
        showStatus('Reading Excel file...');

        // 2. Read the Excel File
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        const sheetName = workbook.SheetNames.includes('PLM data') ? 'PLM data' : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 3. Convert to 2D Array
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        if (data.length < 2) {
            throw new Error('Excel sheet is empty or has only headers.');
        }

        const headerRow = data[0];
        let supplierColIdx = headerRow.findIndex(cell => cell && cell.toString().toLowerCase() === 'supplier name');
        if (supplierColIdx === -1) {
            supplierColIdx = headerRow.findIndex(cell => cell && cell.toString().toLowerCase().includes('supplier'));
        }

        if (supplierColIdx === -1) {
            throw new Error('Could not find "Supplier Name" column in Excel header.');
        }

        showStatus('Extracting vendor data...');

        // 4. Process data into groups
        const splitData = {};
        vendors.forEach(v => { splitData[v.display] = [headerRow]; });

        const exactMap = {};
        vendors.forEach(v => { exactMap[v.exact.toLowerCase()] = v.display; });

        const dataRows = data.slice(1);
        let matchCount = 0;

        dataRows.forEach(row => {
            const supplierVal = row[supplierColIdx];
            if (supplierVal) {
                const cleanVal = supplierVal.toString().trim().toLowerCase();
                const matchedDisplay = exactMap[cleanVal];
                if (matchedDisplay) {
                    splitData[matchedDisplay].push(row);
                    matchCount++;
                }
            }
        });

        // 5. Create ZIP and add files
        showStatus('Creating ZIP module...');
        const zip = new JSZip();
        let filesCreated = 0;

        Object.keys(splitData).forEach(display => {
            const rows = splitData[display];
            if (rows.length > 1) { 
                const newWs = XLSX.utils.aoa_to_sheet(rows);
                if (worksheet['!cols']) newWs['!cols'] = worksheet['!cols'];

                const newWb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(newWb, newWs, "PLM data");

                const excelBuffer = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' });
                const safeVendorName = display.replace(/[\/\:\*\?\"\<\>\|]/g, '-');
                zip.file(`${monthName}-sample-data-${safeVendorName}.xlsx`, excelBuffer);
                filesCreated++;
            }
        });

        if (filesCreated === 0) {
            throw new Error('No matching vendor data found in the sheet.');
        }

        // 6. Write Data (Native file system or Fallback)
        showStatus('Finalizing Download...');
        const zipContent = await zip.generateAsync({ type: "blob" });

        if (fileHandle) {
            // Modern Web API
            const writable = await fileHandle.createWritable();
            await writable.write(zipContent);
            await writable.close();
        } else {
            // Legacy Fallback
            const url = URL.createObjectURL(zipContent);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${monthName}-vendor-extracts.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        showStatus(`Success! Downloaded ${filesCreated} files in ZIP.`);
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalText;

    } catch (err) {
        if (err.name === 'AbortError') {
            showStatus('Download cancelled by user.');
        } else {
            showStatus(err.message || 'An error occurred', true);
        }
        convertBtn.disabled = false;
        convertBtn.innerHTML = `Extract to ZIP`;
    }
});
