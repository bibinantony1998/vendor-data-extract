const STORAGE_KEY = 'vendorDataExtractor.vendors';

// Initial default vendors mapping
const defaultVendors = [
    { id: '1', display: 'Anubhav Apparels Private Limited', exact: 'ANUBHAV APPARELS PVT. LTD.' },
    { id: '2', display: 'Cotton Blossom (India) Private Limited', exact: 'COTTON BLOSSOM (INDIA) PRIVATE LIMITED' },
    { id: '3', display: 'ASN', exact: 'ASN GLOBAL FZC' },
    { id: '4', display: 'Basant India Inc.', exact: 'BASANT INDIA INC.' },
    { id: '5', display: 'Fashion Channel (Pvt) Ltd', exact: 'FASHION CHANNEL (PVT) LTD' },
    { id: '6', display: 'D & J Trading Co.Ltd.', exact: 'D & J TRADING CO.LTD.' }
];

let vendors = [...defaultVendors];

// DOM Elements
const fileInput = document.getElementById('excelFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const convertBtn = document.getElementById('convertBtn');
const vendorListContainer = document.getElementById('vendorListContainer');
const vendorCount = document.getElementById('vendorCount');
const addVendorBtn = document.getElementById('addVendorBtn');
const saveVendorsBtn = document.getElementById('saveVendorsBtn');
const newDisplayInput = document.getElementById('newDisplay');
const newExactInput = document.getElementById('newExact');
const statusMessage = document.getElementById('statusMessage');
const workflowScreen = document.getElementById('workflowScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const summaryVendors = document.getElementById('summaryVendors');
const summaryApproved = document.getElementById('summaryApproved');
const summaryRejected = document.getElementById('summaryRejected');
const summaryInvalid = document.getElementById('summaryInvalid');
const reportTableBody = document.getElementById('reportTableBody');
const reportChartCanvas = document.getElementById('reportChart');
const downloadReportBtn = document.getElementById('downloadReportBtn');
const convertAnotherBtn = document.getElementById('convertAnotherBtn');

let selectedFile = null;
let editingVendorId = null;
let savedVendorsSnapshot = '';
let currentReport = null;
let reportChart = null;

const plusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>`;
const tickIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.75-3.75a1 1 0 111.414-1.414l3.043 3.043 6.543-6.543a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`;

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

function saveVendors(showMessage = true) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors));
    savedVendorsSnapshot = getVendorsSnapshot(vendors);
    updateSaveButtonVisibility();
    if (showMessage) {
        showStatus('Vendors saved to local storage.');
    }
}

function getVendorsSnapshot(list) {
    return JSON.stringify((list || []).map(v => ({
        id: String(v.id || '').trim(),
        display: String(v.display || '').trim(),
        exact: String(v.exact || '').trim()
    })));
}

function updateSaveButtonVisibility() {
    const hasChanges = hasUnsavedVendorChanges();
    saveVendorsBtn.classList.toggle('hidden', !hasChanges);
}

function hasUnsavedVendorChanges() {
    return getVendorsSnapshot(vendors) !== savedVendorsSnapshot;
}

function setAddButtonMode(isEditing) {
    addVendorBtn.innerHTML = isEditing ? tickIcon : plusIcon;
    addVendorBtn.title = isEditing ? 'Update Vendor' : 'Add Vendor';
}

function normalizeHeader(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeStatus(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return 'invalid';
    if (text.includes('approve')) return 'approved';
    if (text.includes('reject')) return 'rejected';
    return 'invalid';
}

function showDashboard(report) {
    currentReport = report;
    workflowScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    renderDashboard(report);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showWorkflow() {
    dashboardScreen.classList.add('hidden');
    workflowScreen.classList.remove('hidden');
}

function renderDashboard(report) {
    summaryVendors.textContent = String(report.vendorRows.length);
    summaryApproved.textContent = String(report.totals.approved);
    summaryRejected.textContent = String(report.totals.rejected);
    summaryInvalid.textContent = String(report.totals.invalid);

    reportTableBody.innerHTML = report.vendorRows.map(row => `
        <tr>
            <td class="px-4 py-3 text-gray-100">${row.vendor}</td>
            <td class="px-4 py-3 text-gray-200">${row.total}</td>
            <td class="px-4 py-3 text-green-300">${row.approved}</td>
            <td class="px-4 py-3 text-red-300">${row.rejected}</td>
            <td class="px-4 py-3 text-amber-300">${row.invalid}</td>
            <td class="px-4 py-3 ${getApprovalColorClass(row.approvalPercentage)} font-semibold">${row.approvalPercentage}%</td>
        </tr>
    `).join('');

    renderReportChart(report.vendorRows);
}

function getApprovalColorClass(percentage) {
    const value = Number(percentage);
    if (value >= 50) return 'text-green-300';
    if (value >= 25) return 'text-amber-300';
    return 'text-red-300';
}

function renderReportChart(rows) {
    if (reportChart) {
        reportChart.destroy();
    }

    reportChart = new Chart(reportChartCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: rows.map(r => r.vendor),
            datasets: [
                {
                    label: 'Approved',
                    data: rows.map(r => r.approved),
                    backgroundColor: 'rgba(34, 197, 94, 0.7)'
                },
                {
                    label: 'Rejected',
                    data: rows.map(r => r.rejected),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)'
                },
                {
                    label: 'Invalid',
                    data: rows.map(r => r.invalid),
                    backgroundColor: 'rgba(245, 158, 11, 0.7)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#cbd5e1' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#cbd5e1', precision: 0 },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0' }
                }
            }
        }
    });
}

function loadVendors() {
    const savedVendors = localStorage.getItem(STORAGE_KEY);
    if (!savedVendors) {
        savedVendorsSnapshot = getVendorsSnapshot(vendors);
        updateSaveButtonVisibility();
        return;
    }

    try {
        const parsed = JSON.parse(savedVendors);
        if (Array.isArray(parsed)) {
            vendors = parsed.filter(v => v && v.id && v.display && v.exact);
        }
    } catch (error) {
        console.error('Unable to parse saved vendors:', error);
    } finally {
        savedVendorsSnapshot = getVendorsSnapshot(vendors);
        updateSaveButtonVisibility();
    }
}

function resetVendorForm() {
    editingVendorId = null;
    newDisplayInput.value = '';
    newExactInput.value = '';
    setAddButtonMode(false);
}

// Vendor Management Handlers
function renderVendors() {
    vendorListContainer.innerHTML = '';
    vendorCount.textContent = vendors.length;

    vendors.forEach(v => {
        const vendorEl = document.createElement('div');
        vendorEl.className = 'group flex items-center justify-between bg-slate-800/80 border border-slate-600/50 p-4 rounded-xl hover:border-blue-500/50 transition-colors';
        
        vendorEl.innerHTML = `
            <div class="flex-1 min-w-0 pr-4">
                <div class="font-semibold text-base text-gray-100 truncate" title="${v.display}">${v.display}</div>
                <div class="text-sm text-gray-300 truncate" title="${v.exact}">Match: ${v.exact}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="deleteVendor('${v.id}')" class="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-600/60 text-gray-300 hover:text-red-300 hover:border-red-400/60 hover:bg-red-500/10 transition-colors" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                </button>
                <button onclick="editVendor('${v.id}')" class="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-600/60 text-gray-300 hover:text-blue-300 hover:border-blue-400/60 hover:bg-blue-500/10 transition-colors" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
            </div>
        `;
        vendorListContainer.appendChild(vendorEl);
    });
}

window.deleteVendor = (id) => {
    vendors = vendors.filter(v => v.id !== id);
    if (editingVendorId === id) {
        resetVendorForm();
    }
    updateSaveButtonVisibility();
    showStatus('Vendor deleted. Click Save Vendors to persist.');
    renderVendors();
};

window.editVendor = (id) => {
    const vendor = vendors.find(v => v.id === id);
    if (!vendor) return;

    editingVendorId = id;
    newDisplayInput.value = vendor.display;
    newExactInput.value = vendor.exact;
    setAddButtonMode(true);
    newDisplayInput.focus();
    showStatus('Editing vendor. Update fields and click tick to apply.');
};

addVendorBtn.addEventListener('click', () => {
    const display = newDisplayInput.value.trim();
    const exact = newExactInput.value.trim();

    if (!display || !exact) {
        showStatus('Display and exact match are required.', true);
        return;
    }

    if (editingVendorId) {
        const vendorToUpdate = vendors.find(v => v.id === editingVendorId);
        if (!vendorToUpdate) {
            showStatus('Vendor not found for update.', true);
            resetVendorForm();
            return;
        }

        vendorToUpdate.display = display;
        vendorToUpdate.exact = exact;
        updateSaveButtonVisibility();
        showStatus('Vendor updated. Click Save Vendors to persist.');
        resetVendorForm();
        renderVendors();
        return;
    }

    vendors.push({
        id: Date.now().toString(),
        display,
        exact
    });
    resetVendorForm();
    updateSaveButtonVisibility();
    showStatus('Vendor added. Click Save Vendors to persist.');
    renderVendors();
});

newExactInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        addVendorBtn.click();
    }
});

saveVendorsBtn.addEventListener('click', () => {
    saveVendors();
});

downloadReportBtn.addEventListener('click', async () => {
    if (!currentReport) return;

    try {
        const reportRows = [
            ['Vendor', 'Total', 'Approved', 'Rejected', 'Invalid', 'Approval %'],
            ...currentReport.vendorRows.map(row => ([
                row.vendor,
                row.total,
                row.approved,
                row.rejected,
                row.invalid,
                Number(row.approvalPercentage)
            ]))
        ];

        const totalsRows = [
            ['Total Vendors', 'Total Approved', 'Total Rejected', 'Total Invalid'],
            [
                currentReport.vendorRows.length,
                currentReport.totals.approved,
                currentReport.totals.rejected,
                currentReport.totals.invalid
            ]
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reportRows), 'Vendor Summary');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(totalsRows), 'Consolidated');

        const sourceName = (currentReport.sourceFileName || 'report').replace(/\.[^/.]+$/, '');
        const fileName = `${sourceName}-vendor-report.xlsx`;
        const excelBuffer = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
            bookSST: true,
            compression: true
        });
        const excelBlob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        if (window.showSaveFilePicker) {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Excel Workbook',
                    accept: {
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                    }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(excelBlob);
            await writable.close();
        } else {
            const url = URL.createObjectURL(excelBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        showStatus('Report downloaded successfully.');
    } catch (err) {
        if (err.name === 'AbortError') {
            showStatus('Report download cancelled by user.');
        } else {
            showStatus('Failed to download report.', true);
        }
    }
});

convertAnotherBtn.addEventListener('click', () => {
    showWorkflow();
    selectedFile = null;
    fileInput.value = '';
    fileNameDisplay.textContent = 'Click to browse Excel file';
    fileNameDisplay.classList.remove('text-blue-400', 'font-semibold');
    convertBtn.disabled = true;
    convertBtn.classList.add('bg-blue-600/50', 'text-gray-300', 'cursor-not-allowed');
    convertBtn.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-500', 'hover:shadow-neon');
    showStatus('Ready for a new source file.');
});

// Initial Render
loadVendors();
renderVendors();


// Core Conversion Logic
convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    try {
        if (hasUnsavedVendorChanges()) {
            saveVendors(false);
            showStatus('Vendor list auto-saved before conversion.');
        }

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
        let supplierColIdx = headerRow.findIndex(cell => normalizeHeader(cell) === 'supplier name');
        if (supplierColIdx === -1) {
            supplierColIdx = headerRow.findIndex(cell => normalizeHeader(cell).includes('supplier'));
        }

        if (supplierColIdx === -1) {
            throw new Error('Could not find "Supplier Name" column in Excel header.');
        }

        let statusColIdx = headerRow.findIndex(cell => normalizeHeader(cell) === 'supplier sample status');
        if (statusColIdx === -1) {
            statusColIdx = headerRow.findIndex(cell => normalizeHeader(cell).includes('supplier sample status'));
        }

        if (statusColIdx === -1) {
            throw new Error('Could not find "Supplier Sample status" column in Excel header.');
        }

        showStatus('Extracting vendor data...');

        // 4. Process data into groups
        const splitData = {};
        vendors.forEach(v => { splitData[v.display] = [headerRow]; });
        const reportMap = {};
        vendors.forEach(v => {
            reportMap[v.display] = {
                vendor: v.display,
                total: 0,
                approved: 0,
                rejected: 0,
                invalid: 0,
                approvalPercentage: 0
            };
        });

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
                    const normalized = normalizeStatus(row[statusColIdx]);
                    reportMap[matchedDisplay].total += 1;
                    reportMap[matchedDisplay][normalized] += 1;
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

        const vendorRows = Object.values(reportMap)
            .filter(row => row.total > 0)
            .map(row => ({
                ...row,
                approvalPercentage: ((row.approved / row.total) * 100).toFixed(1)
            }))
            .sort((a, b) => b.total - a.total);

        const totals = vendorRows.reduce((acc, row) => {
            acc.approved += row.approved;
            acc.rejected += row.rejected;
            acc.invalid += row.invalid;
            return acc;
        }, { approved: 0, rejected: 0, invalid: 0 });

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
        showDashboard({
            sourceFileName: selectedFile.name,
            vendorRows,
            totals
        });

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
