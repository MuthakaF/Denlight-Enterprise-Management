/**
 * Denlight - Secure Enterprise Dashboard Storage Engine Architecture
 */

// --- Persistent Data Object Defaults Engines ---
function getInitialInventory() {
    return [
        { id: "1", name: "Anker USB-C Hub", buyingPrice: 15.00, qty: 25, soldVolume: 0 },
        { id: "2", name: "Logitech MX Master 3S", buyingPrice: 65.00, qty: 10, soldVolume: 0 },
        { id: "3", name: "iPhone 15 Matte Case", buyingPrice: 4.50, qty: 50, soldVolume: 0 }
    ];
}

function getInitialStaff() {
    return ["Ken", "Kate", "Ryan", "Faith"];
}

const DEFAULT_PASSWORD_PLAIN = "denlight2026";

// --- Global Application Data Runtime State Engine ---
let state = {
    inventory: [],
    staff: [],
    historicalLedger: {}, // Month-wise grouped historical ledger
    currentUser: null,
    isShiftActive: false,
    
    // Active Shift Aggregations Buckets
    currentShiftSales: [],
    currentShiftExpenses: [],
    currentSalesProfitTotal: 0.00,
    currentExpensesTotal: 0.00,
    currentNetProfitTotal: 0.00,
    
    activeTab: 'sales',
    activeAnalyticsSection: 'staff'
};

// --- DOM Cache Target Selectors ---
const dom = {
    loginWall: document.getElementById('login-wall'),
    loginForm: document.getElementById('login-form'),
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    appWorkspace: document.getElementById('app-workspace'),
    activeUserBadge: document.getElementById('active-user-badge'),
    securityForm: document.getElementById('security-form'),
    secNewPass: document.getElementById('sec-new-pass'),

    tabs: {
        sales: document.getElementById('tab-sales'),
        inventory: document.getElementById('tab-inventory'),
        staff: document.getElementById('tab-staff'),
        overview: document.getElementById('tab-overview')
    },
    views: {
        sales: document.getElementById('view-sales'),
        inventory: document.getElementById('view-inventory'),
        staff: document.getElementById('view-staff'),
        overview: document.getElementById('view-overview')
    },
    btnClockOut: document.getElementById('btn-clock-out'),
    btnMasterReset: document.getElementById('btn-master-reset'),
    
    inventoryForm: document.getElementById('inventory-form'),
    inventoryControlBox: document.getElementById('inventory-control-box'),
    inventoryLockNotice: document.getElementById('inventory-lock-notice'),
    invActionSelect: document.getElementById('inv-action-select'),
    invNameContainer: document.getElementById('inv-name-container'),
    invName: document.getElementById('inv-name'),
    invBuyingPrice: document.getElementById('inv-buying-price'),
    invQtyLabel: document.getElementById('inv-qty-label'),
    invQty: document.getElementById('inv-qty'),
    inventoryTableBody: document.getElementById('inventory-table-body'),

    staffForm: document.getElementById('staff-form'),
    staffName: document.getElementById('staff-name'),
    staffTableBody: document.getElementById('staff-table-body'),
    
    salesForm: document.getElementById('sales-form'),
    saleItemSelect: document.getElementById('sale-item-select'),
    salePrice: document.getElementById('sale-price'),
    salesTableBody: document.getElementById('sales-table-body'),
    
    expenseForm: document.getElementById('expense-form'),
    expType: document.getElementById('exp-type'),
    expCustomContainer: document.getElementById('exp-custom-container'),
    expCustomDesc: document.getElementById('exp-custom-desc'),
    expAmount: document.getElementById('exp-amount'),
    expensesTableBody: document.getElementById('expenses-table-body'),
    
    statCurrentSalesProfit: document.getElementById('stat-current-sales-profit'),
    statCurrentExpenses: document.getElementById('stat-current-expenses'),
    statCurrentNetProfit: document.getElementById('stat-current-net-profit'),
    
    anBtnStaff: document.getElementById('an-btn-staff'),
    anBtnMonthly: document.getElementById('an-btn-monthly'),
    anBtnStock: document.getElementById('an-btn-stock'),
    anBtnOut: document.getElementById('an-btn-out'),
    anBtnPerformance: document.getElementById('an-btn-performance'),
    anBadgeOut: document.getElementById('an-badge-out'),
    analyticsPanelTitle: document.getElementById('analytics-panel-title'),
    analyticsTableHead: document.getElementById('analytics-table-head'),
    analyticsTableBody: document.getElementById('analytics-table-body')
};

// --- Utilities Cryptography Engines (SHA-256) ---
async function generateSHA256(plainText) {
    const msgBuffer = new TextEncoder().encode(plainText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getActiveFormattedMonthKey() {
    const date = new Date();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// --- View Router Control Swapping Engine ---
function switchMainTab(tabKey) {
    Object.keys(dom.tabs).forEach(k => {
        dom.tabs[k].className = "tab-btn py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-semibold text-xs sm:text-sm focus:outline-none transition inline-block";
        dom.views[k].classList.add('hidden');
    });
    dom.tabs[tabKey].className = "tab-btn py-4 px-1 border-b-2 border-cyan-500 text-cyan-600 font-bold text-xs sm:text-sm focus:outline-none transition inline-block";
    dom.views[tabKey].classList.remove('hidden');
    state.activeTab = tabKey;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tabKey === 'overview') renderAnalyticsViewport();
}

// --- Render Layout Interfaces Pipelines ---
function updateInventoryUI() {
    dom.inventoryTableBody.innerHTML = '';
    dom.saleItemSelect.innerHTML = '<option value="">-- Choose Stock --</option>';
    dom.invActionSelect.innerHTML = '<option value="NEW">-- Create New Product Type --</option>';
    
    let outOfStockCounter = 0;

    state.inventory.forEach(item => {
        if (!item.hasOwnProperty('soldVolume')) item.soldVolume = 0; 
        if (parseInt(item.qty) === 0) outOfStockCounter++;

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 text-gray-700 text-sm transition";
        row.innerHTML = `
            <td class="p-3 font-semibold text-gray-900 break-all">${item.name}</td>
            <td class="p-3 text-right text-gray-500">$${item.buyingPrice.toFixed(2)}</td>
            <td class="p-3 text-right font-bold ${item.qty < 5 ? 'text-rose-600 bg-rose-50':'text-gray-700'}">${item.qty} units</td>
            <td class="p-3 text-right">
                <button class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded transition border border-rose-200" onclick="deleteInventoryItem('${item.id}')">
                    🗑️
                </button>
            </td>
        `;
        dom.inventoryTableBody.appendChild(row);

        if (item.qty > 0) {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (Cost: $${item.buyingPrice.toFixed(2)})`;
            dom.saleItemSelect.appendChild(option);
        }

        const stockOpt = document.createElement('option');
        stockOpt.value = item.id;
        stockOpt.textContent = `Restock: ${item.name}`;
        dom.invActionSelect.appendChild(stockOpt);
    });

    dom.anBadgeOut.textContent = outOfStockCounter;
    handleInventoryActionDropdownState();
}

function handleInventoryActionDropdownState() {
    const selectedValue = dom.invActionSelect.value;
    if (selectedValue === 'NEW') {
        dom.invNameContainer.classList.remove('hidden');
        dom.invName.required = true;
        dom.invQtyLabel.textContent = "Initial Stock Quantity";
        dom.invName.value = "";
        dom.invBuyingPrice.value = "";
        dom.invQty.value = "";
    } else {
        dom.invNameContainer.classList.add('hidden');
        dom.invName.required = false;
        dom.invQtyLabel.textContent = "Additional Restock Quantity";
        
        const targetItem = state.inventory.find(i => i.id === selectedValue);
        if (targetItem) {
            dom.invBuyingPrice.value = targetItem.buyingPrice;
            dom.invQty.value = "";
        }
    }
}

window.deleteInventoryItem = function(id) {
    if (state.currentUser !== "Ken") {
        alert("🔒 Access Denied: Only Ken can delete items from database catalogs.");
        return;
    }
    if (confirm("Remove this item from the Denlight database?")) {
        state.inventory = state.inventory.filter(item => item.id !== id);
        localStorage.setItem('denlight_inventory', JSON.stringify(state.inventory));
        updateInventoryUI();
        if (state.activeTab === 'overview') renderAnalyticsViewport();
    }
};

function updateStaffAndLoginUI() {
    dom.staffTableBody.innerHTML = '';
    dom.loginUsername.innerHTML = '';

    state.staff.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dom.loginUsername.appendChild(option);

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 text-gray-700 font-semibold text-sm transition";
        row.innerHTML = `
            <td class="p-3 text-slate-900">${name}</td>
            <td class="p-3 text-right">
                <button class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded transition border border-rose-200" onclick="deleteStaffMember('${name}')">
                    🗑️ Remove
                </button>
            </td>
        `;
        dom.staffTableBody.appendChild(row);
    });
}

function deleteStaffMember(name) {
    if (state.currentUser !== "Ken") {
        alert("🔒 Access Denied: Only Ken can modify staff profiles.");
        return;
    }
    if (name === "Ken") {
        alert("Action Aborted: The master profile administrator cannot be deleted.");
        return;
    }
    if (confirm(`Remove ${name} from active store registers?`)) {
        state.staff = state.staff.filter(member => member !== name);
        localStorage.setItem('denlight_staff', JSON.stringify(state.staff));
        updateStaffAndLoginUI();
        if (state.activeTab === 'overview') renderAnalyticsViewport();
    }
}
window.deleteStaffMember = deleteStaffMember;

function updateSalesAndExpensesUI() {
    dom.salesTableBody.innerHTML = '';
    state.currentShiftSales.forEach(s => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="p-3 font-medium break-all">${s.itemName}</td><td class="p-3 text-gray-600">$${s.soldPrice.toFixed(2)}</td><td class="p-3 text-emerald-600 font-bold">+$${s.profit.toFixed(2)}</td><td class="p-3"><span class="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded text-xs">${s.seller}</span></td>`;
        dom.salesTableBody.appendChild(row);
    });

    dom.expensesTableBody.innerHTML = '';
    state.currentShiftExpenses.forEach(e => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="p-2 font-medium">${e.displayType}</td><td class="p-2 text-right text-rose-600 font-bold">-$${e.amount.toFixed(2)}</td>`;
        dom.expensesTableBody.appendChild(row);
    });

    state.currentNetProfitTotal = state.currentSalesProfitTotal - state.currentExpensesTotal;
    dom.statCurrentSalesProfit.textContent = `$${state.currentSalesProfitTotal.toFixed(2)}`;
    dom.statCurrentExpenses.textContent = `$${state.currentExpensesTotal.toFixed(2)}`;
    dom.statCurrentNetProfit.textContent = `$${state.currentNetProfitTotal.toFixed(2)}`;
}

// --- Analytics Viewport Engine ---
function renderAnalyticsViewport() {
    dom.analyticsTableHead.innerHTML = '';
    dom.analyticsTableBody.innerHTML = '';

    const buttons = { staff: dom.anBtnStaff, monthly: dom.anBtnMonthly, stock: dom.anBtnStock, out: dom.anBtnOut, performance: dom.anBtnPerformance };
    Object.keys(buttons).forEach(k => { buttons[k].className = "text-left p-3 rounded-lg font-semibold text-xs sm:text-sm border bg-white hover:bg-gray-50 text-gray-700 transition truncate"; });
    dom.anBtnOut.className = "text-left p-3 rounded-lg font-semibold text-xs sm:text-sm border bg-white hover:bg-gray-50 text-red-600 transition flex justify-between items-center truncate";

    const activeBtn = buttons[state.activeAnalyticsSection];
    if (activeBtn) {
        activeBtn.className = `text-left p-3 rounded-lg font-bold text-xs sm:text-sm border ${state.activeAnalyticsSection === 'out' ? 'bg-red-600' : 'bg-cyan-600'} text-white shadow-sm transition truncate w-full`;
    }

    if (state.activeAnalyticsSection === 'staff') {
        dom.analyticsPanelTitle.textContent = "Employee Performance Metrics (Current Shift)";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Employee Name</th><th class="p-3 text-center">Volume</th><th class="p-3 text-right">Profit</th></tr>`;
        state.staff.forEach(name => {
            const staffSales = state.currentShiftSales.filter(s => s.seller === name);
            const totalVolume = staffSales.length;
            const netProfit = staffSales.reduce((acc, curr) => acc + curr.profit, 0);
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3 font-bold text-slate-900">${name}</td><td class="p-3 text-center text-gray-600 font-bold">${totalVolume} items</td><td class="p-3 text-right text-emerald-600 font-black">+$${netProfit.toFixed(2)}</td>`;
            dom.analyticsTableBody.appendChild(row);
        });
    }
    else if (state.activeAnalyticsSection === 'monthly') {
        // Grouped Month-Wise Ledger View
        dom.analyticsPanelTitle.textContent = "Historical Ledger Statement (Month-Wise Aggregates)";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Calendar Month</th><th class="p-3 text-center">Transactions Count</th><th class="p-3 text-right">Net Shift Profit Generated</th></tr>`;
        
        const monthsTracked = Object.keys(state.historicalLedger);
        if (monthsTracked.length === 0) {
            dom.analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-400">No historical monthly statements are on file yet. Logs compile on shift clock outs.</td></tr>`;
        } else {
            monthsTracked.forEach(monthKey => {
                const monthData = state.historicalLedger[monthKey];
                const row = document.createElement('tr');
                row.className = "font-medium text-gray-700";
                row.innerHTML = `
                    <td class="p-3 font-bold text-slate-900">${monthKey}</td>
                    <td class="p-3 text-center text-slate-500">${monthData.totalSalesCount} volume</td>
                    <td class="p-3 text-right text-cyan-700 font-black">$${monthData.netProfitBanked.toFixed(2)}</td>
                `;
                dom.analyticsTableBody.appendChild(row);
            });
        }
    }
    else if (state.activeAnalyticsSection === 'stock') {
        dom.analyticsPanelTitle.textContent = "Warehouse Stock Levels Ledger";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Product Name</th><th class="p-3 text-right">Qty</th><th class="p-3 text-center">Status</th></tr>`;
        state.inventory.forEach(item => {
            let statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold">Good</span>`;
            if (item.qty === 0) statusBadge = `<span class="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-bold">Empty</span>`;
            else if (item.qty < 5) statusBadge = `<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-bold">Low</span>`;
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3 font-semibold text-gray-800 break-all">${item.name}</td><td class="p-3 text-right font-black">${item.qty} u</td><td class="p-3 text-center">${statusBadge}</td>`;
            dom.analyticsTableBody.appendChild(row);
        });
    }
    else if (state.activeAnalyticsSection === 'out') {
        dom.analyticsPanelTitle.textContent = "Urgent Stock Replenishment Critical Logs";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Product Name</th><th class="p-3 text-right">Cost</th><th class="p-3 text-center">Status</th></tr>`;
        const outOfStockItems = state.inventory.filter(item => parseInt(item.qty) === 0);
        if (outOfStockItems.length === 0) {
            dom.analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-400 font-medium">✓ Stock levels healthy.</td></tr>`;
        } else {
            outOfStockItems.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `<td class="p-3 font-bold text-rose-900 break-all">${item.name}</td><td class="p-3 text-right text-gray-600">$${item.buyingPrice.toFixed(2)}</td><td class="p-3 text-center"><span class="text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded text-xs font-bold whitespace-nowrap">OUT</span></td>`;
                dom.analyticsTableBody.appendChild(row);
            });
        }
    }
    else if (state.activeAnalyticsSection === 'performance') {
        dom.analyticsPanelTitle.textContent = "All-Time Product Sales Volumes";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Product Name</th><th class="p-3 text-center">Units Sold</th><th class="p-3 text-center">Rank</th></tr>`;
        let sortedItems = [...state.inventory].sort((a, b) => (b.soldVolume || 0) - (a.soldVolume || 0));
        sortedItems.forEach((item, index) => {
            const volume = item.soldVolume || 0;
            let rankingBadge = `<span class="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">Mid</span>`;
            if (index === 0 && volume > 0) rankingBadge = `<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-black whitespace-nowrap">🔥 High</span>`;
            else if (index === sortedItems.length - 1 || volume === 0) rankingBadge = `<span class="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded font-normal whitespace-nowrap">Low</span>`;
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3 font-semibold text-gray-800 break-all">${item.name}</td><td class="p-3 text-center font-bold text-slate-900">${volume} sold</td><td class="p-3 text-center">${rankingBadge}</td>`;
            dom.analyticsTableBody.appendChild(row);
        });
    }
}

// --- Dynamic Interaction Wire Bindings ---
Object.keys(dom.tabs).forEach(key => { dom.tabs[key].addEventListener('click', () => switchMainTab(key)); });
dom.anBtnStaff.addEventListener('click', () => switchAnalyticsSection('staff'));
dom.anBtnMonthly.addEventListener('click', () => switchAnalyticsSection('monthly'));
dom.anBtnStock.addEventListener('click', () => switchAnalyticsSection('stock'));
dom.anBtnOut.addEventListener('click', () => switchAnalyticsSection('out'));
dom.anBtnPerformance.addEventListener('click', () => switchAnalyticsSection('performance'));

// --- Authentication Engine Mechanics Flow ---
dom.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    dom.loginError.classList.add('hidden');
    
    const userSelected = dom.loginUsername.value;
    const plainPasswordInput = dom.loginPassword.value.trim();
    
    const inputHash = await generateSHA256(plainPasswordInput);
    const targetMasterHash = localStorage.getItem('denlight_secure_hash');

    if (inputHash === targetMasterHash) {
        state.currentUser = userSelected;
        state.isShiftActive = true;
        
        state.currentShiftSales = [];
        state.currentShiftExpenses = [];
        state.currentSalesProfitTotal = 0.00;
        state.currentExpensesTotal = 0.00;
        state.currentNetProfitTotal = 0.00;

        dom.activeUserBadge.textContent = `User: ${state.currentUser}`;
        dom.loginPassword.value = "";
        
        dom.loginWall.classList.add('hidden');
        dom.appWorkspace.classList.remove('hidden');
        dom.appWorkspace.classList.add('flex');

        // Manage Role-Based Privileges Visibility Matrices
        if (state.currentUser === "Ken") {
            dom.btnMasterReset.classList.remove('hidden');
            dom.inventoryControlBox.classList.remove('opacity-40', 'pointer-events-none');
            dom.inventoryLockNotice.classList.add('hidden');
        } else {
            dom.btnMasterReset.classList.add('hidden');
            dom.inventoryControlBox.classList.add('opacity-40', 'pointer-events-none');
            dom.inventoryLockNotice.classList.remove('hidden');
        }
        
        updateSalesAndExpensesUI();
        switchMainTab('sales');
    } else {
        dom.loginError.classList.remove('hidden');
        dom.loginPassword.value = "";
    }
});

dom.btnClockOut.addEventListener('click', () => {
    if (!state.isShiftActive) return;
    
    if (confirm(`Clock out shift for ${state.currentUser}?\nNet Settled Shift Profit: $${state.currentNetProfitTotal.toFixed(2)}`)) {
        
        // Group & Commit data logs month-wise to historical matrices
        const currentMonthKey = getActiveFormattedMonthKey();
        if (!state.historicalLedger[currentMonthKey]) {
            state.historicalLedger[currentMonthKey] = { totalSalesCount: 0, netProfitBanked: 0.00 };
        }
        state.historicalLedger[currentMonthKey].totalSalesCount += state.currentShiftSales.length;
        state.historicalLedger[currentMonthKey].netProfitBanked += state.currentNetProfitTotal;
        
        localStorage.setItem('denlight_historical_ledger', JSON.stringify(state.historicalLedger));

        state.isShiftActive = false;
        state.currentUser = null;
        
        dom.appWorkspace.classList.add('hidden');
        dom.appWorkspace.classList.remove('flex');
        dom.loginWall.classList.remove('hidden');
        dom.loginError.classList.add('hidden');
    }
});

dom.securityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (state.currentUser !== "Ken") {
        alert("🔒 Access Denied: Only Ken can update the system master password.");
        dom.secNewPass.value = "";
        return;
    }

    const newPlaintextPass = dom.secNewPass.value.trim();
    if (newPlaintextPass.length < 6) {
        alert("The shop password must be at least 6 characters long.");
        return;
    }

    const encryptedHash = await generateSHA256(newPlaintextPass);
    localStorage.setItem('denlight_secure_hash', encryptedHash);
    
    dom.secNewPass.value = "";
    alert("✅ Success: Master Access Password Updated!");
});

// --- Standard Operational Mutation Handlers ---
dom.inventoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.currentUser !== "Ken") {
        alert("🔒 Access Denied: Only Ken can alter stock configurations.");
        return;
    }

    const actionValue = dom.invActionSelect.value;
    const inputPrice = parseFloat(dom.invBuyingPrice.value);
    const inputQty = parseInt(dom.invQty.value);

    if (actionValue === 'NEW') {
        const newItem = { id: Date.now().toString(), name: dom.invName.value.trim(), buyingPrice: inputPrice, qty: inputQty, soldVolume: 0 };
        state.inventory.push(newItem);
    } else {
        const index = state.inventory.findIndex(i => i.id === actionValue);
        if (index !== -1) {
            state.inventory[index].qty += inputQty;
            // Requirement Met: Updates buying price for future sales. Existing logs preserve old calculated bounds.
            state.inventory[index].buyingPrice = inputPrice; 
        }
    }
    localStorage.setItem('denlight_inventory', JSON.stringify(state.inventory));
    updateInventoryUI();
    dom.inventoryForm.reset();
    dom.invActionSelect.value = "NEW";
    handleInventoryActionDropdownState();
});

dom.staffForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.currentUser !== "Ken") {
        alert("🔒 Access Denied: Only Ken can add employees.");
        return;
    }
    const cleanName = dom.staffName.value.trim();
    if (state.staff.includes(cleanName)) { alert("This employee name already exists."); return; }
    state.staff.push(cleanName);
    localStorage.setItem('denlight_staff', JSON.stringify(state.staff));
    updateStaffAndLoginUI();
    dom.staffForm.reset();
});

dom.salesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const itemId = dom.saleItemSelect.value;
    const soldPrice = parseFloat(dom.salePrice.value);
    const itemIndex = state.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1 || state.inventory[itemIndex].qty <= 0) return;

    const item = state.inventory[itemIndex];
    // Immutable Profit Logic: Captures active item buying price at this exact split-second
    const calculatedProfit = soldPrice - item.buyingPrice; 

    state.inventory[itemIndex].qty -= 1;
    state.inventory[itemIndex].soldVolume = (state.inventory[itemIndex].soldVolume || 0) + 1;
    localStorage.setItem('denlight_inventory', JSON.stringify(state.inventory));

    state.currentShiftSales.push({ itemName: item.name, soldPrice: soldPrice, profit: calculatedProfit, seller: state.currentUser });
    state.currentSalesProfitTotal += calculatedProfit;

    updateInventoryUI();
    updateSalesAndExpensesUI();
    dom.saleItemSelect.value = "";
    dom.salePrice.value = "";
});

dom.expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedType = dom.expType.value;
    const customDesc = dom.expCustomDesc.value.trim();
    const amount = parseFloat(dom.expAmount.value);
    const displayType = selectedType === 'Other' ? `Other: ${customDesc}` : selectedType;

    state.currentShiftExpenses.push({ displayType, amount });
    state.currentExpensesTotal += amount;
    updateSalesAndExpensesUI();
    dom.expenseForm.reset();
    dom.expCustomContainer.classList.add('hidden');
});

// Ken Exclusive Reset Engine Handler
dom.btnMasterReset.addEventListener('click', () => {
    if (state.currentUser !== "Ken") return;
    
    // Multi-staged verification confirmations warning layers
    const step1 = confirm("🛑 CRITICAL WARNING: You are about to completely wipe out the Denlight system data. This removes every sales history log, month ledger, and stock catalog item permanently. Do not proceed unless completely necessary.");
    if (step1) {
        const step2 = confirm("⚠️ FINAL VERIFICATION REQUIRED: Are you absolutely certain you want to clear the entire business database? This action cannot be reversed.");
        if (step2) {
            localStorage.clear();
            initializeApplication();
            alert("System databases successfully purged back to stock parameters.");
        }
    }
});

// --- Secure Application Initialization Bootloader ---
async function initializeApplication() {
    if (!localStorage.getItem('denlight_inventory')) {
        localStorage.setItem('denlight_inventory', JSON.stringify(getInitialInventory()));
    }
    if (!localStorage.getItem('denlight_staff')) {
        localStorage.setItem('denlight_staff', JSON.stringify(getInitialStaff()));
    }
    if (!localStorage.getItem('denlight_secure_hash')) {
        const defaultHash = await generateSHA256(DEFAULT_PASSWORD_PLAIN);
        localStorage.setItem('denlight_secure_hash', defaultHash);
    }
    if (!localStorage.getItem('denlight_historical_ledger')) {
        localStorage.setItem('denlight_historical_ledger', JSON.stringify({}));
    }

    state.inventory = JSON.parse(localStorage.getItem('denlight_inventory'));
    state.staff = JSON.parse(localStorage.getItem('denlight_staff'));
    state.historicalLedger = JSON.parse(localStorage.getItem('denlight_historical_ledger'));
    
    state.currentUser = null;
    state.isShiftActive = false;

    updateInventoryUI();
    updateStaffAndLoginUI();
    updateSalesAndExpensesUI();
    switchAnalyticsSection('staff');

    dom.appWorkspace.classList.add('hidden');
    dom.loginWall.classList.remove('hidden');
    dom.loginError.classList.add('hidden');
    
    console.log("Denlight Security Engine: Successfully Bootstrapped.");
}

// Boot application
initializeApplication();