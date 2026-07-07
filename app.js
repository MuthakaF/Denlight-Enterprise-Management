/**
 * Denlight - Advanced Enterprise Dashboard Storage Engine Architecture
 */

// --- Persistent Data Object Baseline Templates ---
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

// --- Global Application Data Runtime State Engine ---
let state = {
    inventory: [],
    staff: [],
    passwords: {}, // Maps employee name -> SHA-256 password hash
    historicalLedger: {}, 
    currentUser: null,
    isShiftActive: false,
    authMode: 'LOGIN', // 'LOGIN' or 'SIGNUP'
    
    // Active Shift Aggregation Metrics
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
    authSubtitle: document.getElementById('auth-subtitle'),
    loginForm: document.getElementById('login-form'),
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    authError: document.getElementById('auth-error'),
    btnAuthSubmit: document.getElementById('btn-auth-submit'),
    btnToggleAuthMode: document.getElementById('btn-toggle-auth-mode'),
    
    appWorkspace: document.getElementById('app-workspace'),
    activeUserBadge: document.getElementById('active-user-badge'),
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

// --- Core Table Render Drivers ---
function updateInventoryUI() {
    dom.inventoryTableBody.innerHTML = '';
    dom.saleItemSelect.innerHTML = '<option value="">-- Choose Stock --</option>';
    dom.invActionSelect.innerHTML = '<option value="NEW">-- Create New Product Type --</option>';
    
    let outOfStockCounter = 0;

    state.inventory.forEach(item => {
        const itemQty = parseInt(item.qty);
        if (itemQty === 0) outOfStockCounter++;

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 text-gray-700 text-sm transition";
        row.innerHTML = `
            <td class="p-3 font-semibold text-gray-900 break-all">${item.name}</td>
            <td class="p-3 text-right text-gray-500">$${item.buyingPrice.toFixed(2)}</td>
            <td class="p-3 text-right font-bold ${itemQty < 5 ? 'text-rose-600 bg-rose-50':'text-gray-700'}">${itemQty} units</td>
            <td class="p-3 text-right">
                <button class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded transition border border-rose-200" onclick="deleteInventoryItem('${item.id}')">
                    🗑️
                </button>
            </td>
        `;
        dom.inventoryTableBody.appendChild(row);

        if (itemQty > 0) {
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
    if (state.currentUser !== "Ken" && state.currentUser !== "Kate") {
        alert("🔒 Access Denied: Only Ken or Kate possess stock deletion privileges.");
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

        const hasPassSet = state.passwords[name] ? "🔒 Set" : "⚠️ Unset (Needs Registration)";
        const badgeColor = state.passwords[name] ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50";

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 text-gray-700 font-semibold text-sm transition";
        row.innerHTML = `
            <td class="p-3 text-slate-900">${name}</td>
            <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-xs ${badgeColor}">${hasPassSet}</span></td>
            <td class="p-3 text-right">
                <button class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded transition border border-rose-200" onclick="deleteStaffMember('${name}')">
                    🗑️ Remove
                </button>
            </td>
        `;
        dom.staffTableBody.appendChild(row);
    });
}

window.deleteStaffMember = function(name) {
    if (state.currentUser !== "Ken") {
        alert("🔒 Access Denied: Only Ken can delete staff entries.");
        return;
    }
    if (name === "Ken") {
        alert("Action Aborted: The master admin profile cannot be deleted.");
        return;
    }
    if (confirm(`Remove ${name} from active directories?`)) {
        state.staff = state.staff.filter(member => member !== name);
        delete state.passwords[name];
        localStorage.setItem('denlight_staff', JSON.stringify(state.staff));
        localStorage.setItem('denlight_passwords', JSON.stringify(state.passwords));
        updateStaffAndLoginUI();
        if (state.activeTab === 'overview') renderAnalyticsViewport();
    }
};

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

// --- Analytics Engine Functional Viewport Routines ---
function renderAnalyticsViewport() {
    dom.analyticsTableHead.innerHTML = '';
    dom.analyticsTableBody.innerHTML = '';

    const bugFixModeMap = { staff: dom.anBtnStaff, monthly: dom.anBtnMonthly, stock: dom.anBtnStock, out: dom.anBtnOut, performance: dom.anBtnPerformance };
    Object.keys(bugFixModeMap).forEach(k => { bugFixModeMap[k].className = "text-left p-3 rounded-lg font-semibold text-xs sm:text-sm border bg-white hover:bg-gray-50 text-gray-700 transition truncate"; });
    dom.anBtnOut.className = "text-left p-3 rounded-lg font-semibold text-xs sm:text-sm border bg-white hover:bg-gray-50 text-red-600 transition flex justify-between items-center truncate";

    const activeBtn = bugFixModeMap[state.activeAnalyticsSection];
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
        dom.analyticsPanelTitle.textContent = "Historical Month-Wise Ledger Statement";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Calendar Month</th><th class="p-3 text-center">Transactions Count</th><th class="p-3 text-right">Net Profit Banked</th></tr>`;
        
        const monthsTracked = Object.keys(state.historicalLedger);
        if (monthsTracked.length === 0) {
            dom.analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-400">No monthly logs found. Records generate on shift clock outs.</td></tr>`;
        } else {
            monthsTracked.forEach(monthKey => {
                const monthData = state.historicalLedger[monthKey];
                const row = document.createElement('tr');
                row.className = "font-medium text-gray-700 text-sm";
                row.innerHTML = `<td class="p-3 font-bold text-slate-900">${monthKey}</td><td class="p-3 text-center text-slate-500">${monthData.totalSalesCount} units sold</td><td class="p-3 text-right text-cyan-700 font-black">$${monthData.netProfitBanked.toFixed(2)}</td>`;
                dom.analyticsTableBody.appendChild(row);
            });
        }
    }
    else if (state.activeAnalyticsSection === 'stock') {
        dom.analyticsPanelTitle.textContent = "Warehouse Stock Levels Ledger";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Product Name</th><th class="p-3 text-right">Qty Left</th><th class="p-3 text-center">Status</th></tr>`;
        state.inventory.forEach(item => {
            const qtyLeft = parseInt(item.qty);
            let statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold">In Stock</span>`;
            if (qtyLeft === 0) statusBadge = `<span class="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-bold">Out of Stock</span>`;
            else if (qtyLeft < 5) statusBadge = `<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-bold">Low</span>`;
            
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3 font-semibold text-gray-800 break-all">${item.name}</td><td class="p-3 text-right font-black">${qtyLeft} u</td><td class="p-3 text-center">${statusBadge}</td>`;
            dom.analyticsTableBody.appendChild(row);
        });
    }
    else if (state.activeAnalyticsSection === 'out') {
        dom.analyticsPanelTitle.textContent = "Urgent Out of Stock Critical Alerts Room";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Product Name</th><th class="p-3 text-right">Base Cost Price</th><th class="p-3 text-center">Status Label</th></tr>`;
        
        const outOfStockItems = state.inventory.filter(item => parseInt(item.qty) === 0);
        if (outOfStockItems.length === 0) {
            dom.analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-400 font-medium">✓ Excellent. Zero items out of stock.</td></tr>`;
        } else {
            outOfStockItems.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `<td class="p-3 font-bold text-rose-900 break-all">${item.name}</td><td class="p-3 text-right text-gray-600">$${item.buyingPrice.toFixed(2)}</td><td class="p-3 text-center"><span class="text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">OUT OF STOCK</span></td>`;
                dom.analyticsTableBody.appendChild(row);
            });
        }
    }
    else if (state.activeAnalyticsSection === 'performance') {
        dom.analyticsPanelTitle.textContent = "Product Sales Velocity & Velocity Rank Matrix";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Product Name</th><th class="p-3 text-center">Units Sold All-Time</th><th class="p-3 text-center">Performance Status</th></tr>`;
        
        let sortedItems = [...state.inventory].sort((a, b) => (b.soldVolume || 0) - (a.soldVolume || 0));
        sortedItems.forEach((item, index) => {
            const volume = item.soldVolume || 0;
            let rankingBadge = `<span class="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">Standard Velocity</span>`;
            if (index === 0 && volume > 0) rankingBadge = `<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-black whitespace-nowrap">🔥 Highest Selling Item</span>`;
            else if (index === sortedItems.length - 1 || volume === 0) rankingBadge = `<span class="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded font-normal whitespace-nowrap">Lowest Selling Item</span>`;
            
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3 font-semibold text-gray-800 break-all">${item.name}</td><td class="p-3 text-center font-bold text-slate-900">${volume} sold</td><td class="p-3 text-center">${rankingBadge}</td>`;
            dom.analyticsTableBody.appendChild(row);
        });
    }
}

// --- Dynamic Event Wiring Pipelines ---
Object.keys(dom.tabs).forEach(key => { dom.tabs[key].addEventListener('click', () => switchMainTab(key)); });
dom.anBtnStaff.addEventListener('click', () => switchAnalyticsSection('staff'));
dom.anBtnMonthly.addEventListener('click', () => switchAnalyticsSection('monthly'));
dom.anBtnStock.addEventListener('click', () => switchAnalyticsSection('stock'));
dom.anBtnOut.addEventListener('click', () => switchAnalyticsSection('out'));
dom.anBtnPerformance.addEventListener('click', () => switchAnalyticsSection('performance'));

// --- Authentication Mode Logic Switcher ---
dom.btnToggleAuthMode.addEventListener('click', () => {
    dom.authError.classList.add('hidden');
    dom.loginPassword.value = "";
    
    if (state.authMode === 'LOGIN') {
        state.authMode = 'SIGNUP';
        dom.authSubtitle.textContent = "Create Private Employee Password";
        dom.btnAuthSubmit.textContent = "Register Secure Password";
        dom.btnToggleAuthMode.textContent = "Already have a profile set up? Access Clock In →";
    } else {
        state.authMode = 'LOGIN';
        dom.authSubtitle.textContent = "Employee Shift Clock In";
        dom.btnAuthSubmit.textContent = "Verify & Clock In";
        dom.btnToggleAuthMode.textContent = "First time logging in? Create your password profile →";
    }
});

// --- Unified Form Submit Interceptor Router (Handles registration vs verification) ---
dom.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    dom.authError.classList.add('hidden');
    
    const selectedUser = dom.loginUsername.value;
    const plaintextPass = dom.loginPassword.value.trim();
    
    if (!selectedUser) return;

    if (state.authMode === 'SIGNUP') {
        // Enforce character requirements
        if (plaintextPass.length < 4) {
            dom.authError.textContent = "❌ Safety Error: Password must be at least 4 characters long.";
            dom.authError.classList.remove('hidden');
            return;
        }
        
        // Block overwriting existing setups
        if (state.passwords[selectedUser]) {
            dom.authError.textContent = `❌ Reg Error: ${selectedUser} already has an active password profile set.`;
            dom.authError.classList.remove('hidden');
            return;
        }

        const hashed = await generateSHA256(plaintextPass);
        state.passwords[selectedUser] = hashed;
        localStorage.setItem('denlight_passwords', JSON.stringify(state.passwords));
        
        alert(`Password created for ${selectedUser}! Clocking you in automatically...`);
        state.authMode = 'LOGIN'; // Route safely back into standard initialization loop
    }

    // Process standard workspace clock-in authentication
    const hashedCheck = await generateSHA256(plaintextPass);
    const validStoredHash = state.passwords[selectedUser];

    if (!validStoredHash) {
        dom.authError.textContent = "⚠️ This user profile has no password created yet. Choose 'Create Profile' below.";
        dom.authError.classList.remove('hidden');
        return;
    }

    if (hashedCheck === validStoredHash) {
        state.currentUser = selectedUser;
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

        // Manage Role Clearances (Only Ken sees reset buttons)
        if (state.currentUser === "Ken") {
            dom.btnMasterReset.classList.remove('hidden');
        } else {
            dom.btnMasterReset.classList.add('hidden');
        }

        // Manage Stock Room Lock Clearances (Only Ken and Kate can submit)
        if (state.currentUser === "Ken" || state.currentUser === "Kate") {
            dom.inventoryControlBox.classList.remove('opacity-40', 'pointer-events-none');
            dom.inventoryLockNotice.classList.add('hidden');
        } else {
            dom.inventoryControlBox.classList.add('opacity-40', 'pointer-events-none');
            dom.inventoryLockNotice.classList.remove('hidden');
        }
        
        updateStaffAndLoginUI();
        updateSalesAndExpensesUI();
        switchMainTab('sales');
    } else {
        dom.authError.textContent = "❌ Invalid password provided. Please try again.";
        dom.authError.classList.remove('hidden');
        dom.loginPassword.value = "";
    }
});

dom.btnClockOut.addEventListener('click', () => {
    if (!state.isShiftActive) return;
    
    if (confirm(`Clock out shift for ${state.currentUser}?\nNet Settled Shift Profit: $${state.currentNetProfitTotal.toFixed(2)}`)) {
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
        dom.authError.classList.add('hidden');
        
        // Reset login mode interface
        state.authMode = 'LOGIN';
        dom.authSubtitle.textContent = "Employee Shift Clock In";
        dom.btnAuthSubmit.textContent = "Verify & Clock In";
        dom.btnToggleAuthMode.textContent = "First time logging in? Create your password profile →";
        
        initializeApplication();
    }
});

// --- Operational Mutation Handlers ---
dom.inventoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.currentUser !== "Ken" && state.currentUser !== "Kate") {
        alert("🔒 Access Denied: Insufficient data clearances.");
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
            state.inventory[index].buyingPrice = inputPrice; // Updates buying prices for future operations only
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
        alert("🔒 Access Denied: Only Ken can onboard names.");
        return;
    }
    const cleanName = dom.staffName.value.trim();
    if (state.staff.includes(cleanName)) { alert("This profile name already exists."); return; }
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
    const calculatedProfit = soldPrice - item.buyingPrice; // Captures base cost at the immutable split-second of sale

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

dom.btnMasterReset.addEventListener('click', () => {
    if (state.currentUser !== "Ken") return;
    
    const step1 = confirm("🛑 ATTENTION ADMIN: You are attempting to trigger a full system reset. This will clear out every record, monthly ledger statement, stock count, and profile password permanently.");
    if (step1) {
        const step2 = confirm("⚠️ CRITICAL VERIFICATION: This is a destructive operation. Are you absolutely certain you want to purge all enterprise data?");
        if (step2) {
            localStorage.clear();
            initializeApplication();
            alert("Database successfully purged back to template stock defaults.");
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
    if (!localStorage.getItem('denlight_passwords')) {
        localStorage.setItem('denlight_passwords', JSON.stringify({}));
    }
    if (!localStorage.getItem('denlight_historical_ledger')) {
        localStorage.setItem('denlight_historical_ledger', JSON.stringify({}));
    }

    state.inventory = JSON.parse(localStorage.getItem('denlight_inventory'));
    state.staff = JSON.parse(localStorage.getItem('denlight_staff'));
    state.passwords = JSON.parse(localStorage.getItem('denlight_passwords'));
    state.historicalLedger = JSON.parse(localStorage.getItem('denlight_historical_ledger'));
    
    state.currentUser = null;
    state.isShiftActive = false;

    updateInventoryUI();
    updateStaffAndLoginUI();
    updateSalesAndExpensesUI();
    switchAnalyticsSection('staff');

    dom.appWorkspace.classList.add('hidden');
    dom.loginWall.classList.remove('hidden');
    dom.authError.classList.add('hidden');
    
    console.log("Denlight Ecosystem Engine: Safely Bootstrapped.");
}

// Fire Bootloader
initializeApplication();