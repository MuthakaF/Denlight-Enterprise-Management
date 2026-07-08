/**
 * Denlight - Advanced Enterprise Dashboard Storage Engine Architecture
 */

// --- Persistent Data Baseline Initializations ---
function getInitialInventory() {
    return [
        { id: "1", name: "Anker USB-C Hub", buyingPrice: 15.00, qty: 25, soldVolume: 0 },
        { id: "2", name: "Logitech MX Master 3S", buyingPrice: 65.00, qty: 10, soldVolume: 0 },
        { id: "3", name: "iPhone 15 Matte Case", buyingPrice: 4.50, qty: 50, soldVolume: 0 }
    ];
}

// Master Admin/Owner Root Configuration Parameters
const OWNER_EMAIL_1 = "ken@denlight.com";
const OWNER_EMAIL_2 = "catherinewairimumuthaka@gmail.com";
const EMPLOYEE_1 = "faithmuthaka@gmail.com"

function getInitialWhitelistedEmails() {
    return [OWNER_EMAIL_1, OWNER_EMAIL_2];
}

// --- Global Application Runtime States ---
let state = {
    inventory: [],
    whitelistedEmails: [], // Array of approved corporate email keys
    passwords: {},         // Email -> SHA-256 hash
    historicalLedger: {}, 
    currentUser: null,     // Holds current authenticated email string
    isShiftActive: false,
    authMode: 'CHECK',     // 'CHECK', 'LOGIN', or 'SIGNUP'
    activeTargetEmail: '',
    
    // Shift Analytics Buckets
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
    authBadge: document.getElementById('auth-badge'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    passwordFieldContainer: document.getElementById('password-field-container'),
    passwordInputLabel: document.getElementById('password-input-label'),
    authError: document.getElementById('auth-error'),
    btnAuthSubmit: document.getElementById('btn-auth-submit'),
    
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

    inventoryTabsItem: document.getElementById('tab-inventory'),
    staffTabsItem: document.getElementById('tab-staff'),
    overviewTabsItem: document.getElementById('tab-overview'),
    salesTabsItem: document.getElementById('tab-sales'),

    staffForm: document.getElementById('staff-form'),
    staffEmailInput: document.getElementById('staff-email-input'),
    staffTableBody: document.getElementById('staff-table-body'),
    staffWorkspaceWrapper: document.getElementById('staff-workspace-wrapper'),
    staffLockNotice: document.getElementById('staff-lock-notice'),
    
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

// --- Crypto Verification Engines ---
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

// --- View Router Tab Switching Controller ---
function switchMainTab(tabKey) {
    const tabElements = { sales: dom.salesTabsItem, inventory: dom.inventoryTabsItem, staff: dom.staffTabsItem, overview: dom.overviewTabsItem };
    const viewElements = { sales: document.getElementById('view-sales'), inventory: document.getElementById('view-inventory'), staff: document.getElementById('view-staff'), overview: document.getElementById('view-overview') };

    Object.keys(tabElements).forEach(k => {
        if (tabElements[k]) tabElements[k].className = "tab-btn py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-semibold text-xs sm:text-sm focus:outline-none transition inline-block";
        if (viewElements[k]) viewElements[k].classList.add('hidden');
    });

    if (tabElements[tabKey]) tabElements[tabKey].className = "tab-btn py-4 px-1 border-b-2 border-cyan-500 text-cyan-600 font-bold text-xs sm:text-sm focus:outline-none transition inline-block";
    if (viewElements[tabKey]) viewElements[tabKey].classList.remove('hidden');
    
    state.activeTab = tabKey;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tabKey === 'overview') renderAnalyticsViewport();
}

// --- Render Operations Tables UI Layers ---
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
                <button class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded transition border border-rose-200" onclick="deleteInventoryItem('${item.id}')">🗑️</button>
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
    if (state.currentUser !== OWNER_EMAIL_1 && state.currentUser !== OWNER_EMAIL_2) {
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
    state.whitelistedEmails.forEach(email => {
        const isRegistered = state.passwords[email] ? "🔒 Profile Active" : "⚠️ Invite Dispatched (Pending Registration)";
        const badgeStyle = state.passwords[email] ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50";

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 text-gray-700 text-sm transition";
        row.innerHTML = `
            <td class="p-3 text-slate-900 break-all font-medium">${email}</td>
            <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-xs font-bold ${badgeStyle}">${isRegistered}</span></td>
            <td class="p-3 text-right">
                <button class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded border border-rose-200" onclick="deleteWhitelistedEmail('${email}')">🗑️ Revoke</button>
            </td>
        `;
        dom.staffTableBody.appendChild(row);
    });
}

window.deleteWhitelistedEmail = function(email) {
    if (state.currentUser !== OWNER_EMAIL_1 && state.currentUser !== OWNER_EMAIL_2) {
        alert("🔒 Access Denied: Only Ken or Kate holds structural admin role to purge Whitelist permissions.");
        return;
    }
    if (email === OWNER_EMAIL_1 || email === OWNER_EMAIL_2) {
        alert("Action Revoked: System ownership profiles cannot be whitelisted away.");
        return;
    }
    if (confirm(`Revoke corporate system authorization from ${email}?`)) {
        state.whitelistedEmails = state.whitelistedEmails.filter(e => e !== email);
        delete state.passwords[email];
        localStorage.setItem('denlight_whitelisted_emails', JSON.stringify(state.whitelistedEmails));
        localStorage.setItem('denlight_passwords', JSON.stringify(state.passwords));
        updateStaffAndLoginUI();
        if (state.activeTab === 'overview') renderAnalyticsViewport();
    }
};

function updateSalesAndExpensesUI() {
    dom.salesTableBody.innerHTML = '';
    state.currentShiftSales.forEach(s => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="p-3 font-medium break-all">${s.itemName}</td><td class="p-3 text-gray-600">$${s.soldPrice.toFixed(2)}</td><td class="p-3 text-emerald-600 font-bold">+$${s.profit.toFixed(2)}</td><td class="p-3"><span class="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded text-xs break-all">${s.seller}</span></td>`;
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

// --- Analytics Viewport Switching ---
function switchAnalyticsSection(sectionKey) {
    state.activeAnalyticsSection = sectionKey;
    renderAnalyticsViewport();
}

function renderAnalyticsViewport() {
    dom.analyticsTableHead.innerHTML = '';
    dom.analyticsTableBody.innerHTML = '';

    const bugFixModeMap = { staff: dom.anBtnStaff, monthly: dom.anBtnMonthly, stock: dom.anBtnStock, out: dom.anBtnOut, performance: dom.anBtnPerformance };
    Object.keys(bugFixModeMap).forEach(k => { bugFixModeMap[k].className = "text-left p-3 rounded-lg font-semibold text-xs sm:text-sm border bg-white hover:bg-gray-50 text-gray-700 transition truncate"; });
    dom.anBtnOut.className = "text-left p-3 rounded-lg font-semibold text-xs sm:text-sm border bg-white hover:bg-gray-50 text-red-600 transition flex justify-between items-center truncate";

    const activeBtn = bugFixModeMap[state.activeAnalyticsSection];
    if (activeBtn) activeBtn.className = `text-left p-3 rounded-lg font-bold text-xs sm:text-sm border ${state.activeAnalyticsSection === 'out' ? 'bg-red-600' : 'bg-cyan-600'} text-white shadow-sm transition truncate w-full`;

    if (state.activeAnalyticsSection === 'staff') {
        dom.analyticsPanelTitle.textContent = "Employee Performance Metrics (Current Shift)";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Employee Email</th><th class="p-3 text-center">Volume</th><th class="p-3 text-right">Profit Generated</th></tr>`;
        state.whitelistedEmails.forEach(email => {
            const staffSales = state.currentShiftSales.filter(s => s.seller === email);
            if (staffSales.length === 0 && !state.passwords[email]) return; // Skip showing inactive un-onboarded emails
            const totalVolume = staffSales.length;
            const netProfit = staffSales.reduce((acc, curr) => acc + curr.profit, 0);
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3 font-bold text-slate-900 break-all">${email}</td><td class="p-3 text-center text-gray-600 font-bold">${totalVolume} items</td><td class="p-3 text-right text-emerald-600 font-black">+$${netProfit.toFixed(2)}</td>`;
            dom.analyticsTableBody.appendChild(row);
        });
    }
    else if (state.activeAnalyticsSection === 'monthly') {
        dom.analyticsPanelTitle.textContent = "Historical Month-Wise Ledger Statement";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Calendar Month</th><th class="p-3 text-center">Transactions</th><th class="p-3 text-right">Net Profit Banked</th></tr>`;
        const monthsTracked = Object.keys(state.historicalLedger);
        if (monthsTracked.length === 0) {
            dom.analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-400">No monthly ledgers compiled yet. Close shifts to populate.</td></tr>`;
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
        dom.analyticsPanelTitle.textContent = "Warehouse Stock Levels Balance Ledger";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Product Name</th><th class="p-3 text-right">Qty Left</th><th class="p-3 text-center">Status</th></tr>`;
        state.inventory.forEach(item => {
            const qtyLeft = parseInt(item.qty);
            let statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold">Healthy</span>`;
            if (qtyLeft === 0) statusBadge = `<span class="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-bold">Empty</span>`;
            else if (qtyLeft < 5) statusBadge = `<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-bold">Low</span>`;
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3 font-semibold text-gray-800 break-all">${item.name}</td><td class="p-3 text-right font-black">${qtyLeft} u</td><td class="p-3 text-center">${statusBadge}</td>`;
            dom.analyticsTableBody.appendChild(row);
        });
    }
    else if (state.activeAnalyticsSection === 'out') {
        dom.analyticsPanelTitle.textContent = "Urgent Out of Stock Alerts Sheet";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Product Name</th><th class="p-3 text-right">Base Cost Price</th><th class="p-3 text-center">Action Label</th></tr>`;
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
        dom.analyticsPanelTitle.textContent = "Product Performance Velocity Matrix";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Product Name</th><th class="p-3 text-center">Units Sold All-Time</th><th class="p-3 text-center">Rank</th></tr>`;
        let sortedItems = [...state.inventory].sort((a, b) => (b.soldVolume || 0) - (a.soldVolume || 0));
        sortedItems.forEach((item, index) => {
            const volume = item.soldVolume || 0;
            let rankingBadge = `<span class="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">Mid</span>`;
            if (index === 0 && volume > 0) rankingBadge = `<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-black whitespace-nowrap">🔥 Leader</span>`;
            else if (index === sortedItems.length - 1 || volume === 0) rankingBadge = `<span class="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded font-normal whitespace-nowrap">Low</span>`;
            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3 font-semibold text-gray-800 break-all">${item.name}</td><td class="p-3 text-center font-bold text-slate-900">${volume} sold</td><td class="p-3 text-center">${rankingBadge}</td>`;
            dom.analyticsTableBody.appendChild(row);
        });
    }
}

// --- Dynamic Event Wiring Triggers ---
dom.salesTabsItem.addEventListener('click', () => switchMainTab('sales'));
dom.inventoryTabsItem.addEventListener('click', () => switchMainTab('inventory'));
dom.staffTabsItem.addEventListener('click', () => switchMainTab('staff'));
dom.overviewTabsItem.addEventListener('click', () => switchMainTab('overview'));

dom.anBtnStaff.addEventListener('click', () => switchAnalyticsSection('staff'));
dom.anBtnMonthly.addEventListener('click', () => switchAnalyticsSection('monthly'));
dom.anBtnStock.addEventListener('click', () => switchAnalyticsSection('stock'));
dom.anBtnOut.addEventListener('click', () => switchAnalyticsSection('out'));
dom.anBtnPerformance.addEventListener('click', () => switchAnalyticsSection('performance'));

// --- Email Authentication Architecture Engine ---
dom.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    dom.authError.classList.add('hidden');
    
    const emailInput = dom.loginEmail.value.trim().toLowerCase();
    const passwordInput = dom.loginPassword.value.trim();

    // Verification Step 1: Validate email whitelist access
    if (!state.whitelistedEmails.includes(emailInput)) {
        dom.authError.textContent = "🔒 Access Denied: This email address is not whitelisted by Denlight management.";
        dom.authError.classList.remove('hidden');
        return;
    }

    // Verification Step 2: Handle dynamic UI state routing based on profile state
    if (state.authMode === 'CHECK') {
        state.activeTargetEmail = emailInput;
        dom.loginEmail.disabled = true; // Lock field for consistency
        dom.passwordFieldContainer.classList.remove('hidden');
        dom.loginPassword.required = true;

        if (state.passwords[emailInput]) {
            state.authMode = 'LOGIN';
            dom.authBadge.textContent = "Shift Login Mode";
            dom.authBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700";
            dom.passwordInputLabel.textContent = "Enter Password to Clock In";
            dom.btnAuthSubmit.textContent = "Verify & Clock In";
        } else {
            state.authMode = 'SIGNUP';
            dom.authBadge.textContent = "First-Time Registration";
            dom.authBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700";
            dom.passwordInputLabel.textContent = "Set a Secure Access Password";
            dom.btnAuthSubmit.textContent = "Register Secure Account";
        }
        return;
    }

    // Verification Step 3: Complete execution routines based on user routing choice
    if (state.authMode === 'SIGNUP') {
        if (passwordInput.length < 6) {
            dom.authError.textContent = "❌ Security Error: Passwords must be at least 6 characters long.";
            dom.authError.classList.remove('hidden');
            return;
        }
        state.passwords[state.activeTargetEmail] = await generateSHA256(passwordInput);
        localStorage.setItem('denlight_passwords', JSON.stringify(state.passwords));
        alert("Account Registered Successfully! Logging into workspace...");
        state.authMode = 'LOGIN';
    }

    // Process Login Comparisons
    const computedHash = await generateSHA256(passwordInput);
    if (computedHash === state.passwords[state.activeTargetEmail]) {
        state.currentUser = state.activeTargetEmail;
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

        // Manage Role Visibility Matrices (Ken Only Actions)
        if (state.currentUser === OWNER_EMAIL_1) {
            dom.btnMasterReset.classList.remove('hidden');
        } else {
            dom.btnMasterReset.classList.add('hidden');
        }

        // Manage Staffing Directory Actions (Ken & Kate)
        if (state.currentUser === OWNER_EMAIL_1 || state.currentUser === OWNER_EMAIL_2) {
            dom.staffWorkspaceWrapper.classList.remove('hidden');
            dom.staffLockNotice.classList.add('hidden');
            dom.inventoryControlBox.classList.remove('opacity-40', 'pointer-events-none');
            dom.inventoryLockNotice.classList.add('hidden');
        } else {
            dom.staffWorkspaceWrapper.classList.add('hidden');
            dom.staffLockNotice.classList.remove('hidden');
            dom.inventoryControlBox.classList.add('opacity-40', 'pointer-events-none');
            dom.inventoryLockNotice.classList.remove('hidden');
        }
        
        updateStaffAndLoginUI();
        updateSalesAndExpensesUI();
        switchMainTab('sales');
    } else {
        dom.authError.textContent = "❌ Invalid account validation password. Please try again.";
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

        // Reset workspace configurations
        state.isShiftActive = false;
        state.currentUser = null;
        state.authMode = 'CHECK';
        state.activeTargetEmail = '';

        dom.loginEmail.disabled = false;
        dom.loginEmail.value = "";
        dom.loginPassword.value = "";
        dom.passwordFieldContainer.classList.add('hidden');
        dom.authBadge.textContent = "Checking Email Status...";
        dom.authBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700";
        dom.btnAuthSubmit.textContent = "Proceed";
        
        dom.appWorkspace.classList.add('hidden');
        dom.appWorkspace.classList.remove('flex');
        dom.loginWall.classList.remove('hidden');
        dom.authError.classList.add('hidden');
        
        initializeApplication();
    }
});

// --- Onboarding & Stock Modifiers Logic ---
dom.inventoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.currentUser !== OWNER_EMAIL_1 && state.currentUser !== OWNER_EMAIL_2) return;

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
    if (state.currentUser !== OWNER_EMAIL_1 && state.currentUser !== OWNER_EMAIL_2) return;

    const addedEmail = dom.staffEmailInput.value.trim().toLowerCase();
    if (state.whitelistedEmails.includes(addedEmail)) {
        alert("This corporate account has already been whitelisted.");
        return;
    }

    state.whitelistedEmails.push(addedEmail);
    localStorage.setItem('denlight_whitelisted_emails', JSON.stringify(state.whitelistedEmails));
    
    // BACKEND INTEGRATION BRIDGE:
    // If using Cloudflare Workers + Mailgun/Sendgrid, insert your fetch() call here:
    // fetch('https://your-worker.workers.dev/invite', { method: 'POST', body: JSON.stringify({ email: addedEmail }) });
    console.log(`[SMTP SIMULATION]: Invitation notification email dispatched safely to ${addedEmail}`);

    updateStaffAndLoginUI();
    dom.staffForm.reset();
    alert(`Success: ${addedEmail} whitelisted. Email invite simulation logged to system console.`);
});

dom.salesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const itemId = dom.saleItemSelect.value;
    const soldPrice = parseFloat(dom.salePrice.value);
    const itemIndex = state.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1 || state.inventory[itemIndex].qty <= 0) return;

    const item = state.inventory[itemIndex];
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

dom.btnMasterReset.addEventListener('click', () => {
    if (state.currentUser !== OWNER_EMAIL_1) return;
    const step1 = confirm("🛑 ATTENTION ADMIN: You are resetting all localized datasets back to base trial defaults.");
    if (step1) {
        localStorage.clear();
        initializeApplication();
        alert("Purge operation complete.");
    }
});

// --- Secure Application Initialization Bootloader ---
async function initializeApplication() {
    if (!localStorage.getItem('denlight_inventory')) {
        localStorage.setItem('denlight_inventory', JSON.stringify(getInitialInventory()));
    }
    if (!localStorage.getItem('denlight_whitelisted_emails')) {
        localStorage.setItem('denlight_whitelisted_emails', JSON.stringify(getInitialWhitelistedEmails()));
    }
    if (!localStorage.getItem('denlight_passwords')) {
        localStorage.setItem('denlight_passwords', JSON.stringify({}));
    }
    if (!localStorage.getItem('denlight_historical_ledger')) {
        localStorage.setItem('denlight_historical_ledger', JSON.stringify({}));
    }

    state.inventory = JSON.parse(localStorage.getItem('denlight_inventory'));
    state.whitelistedEmails = JSON.parse(localStorage.getItem('denlight_whitelisted_emails'));
    state.passwords = JSON.parse(localStorage.getItem('denlight_passwords'));
    state.historicalLedger = JSON.parse(localStorage.getItem('denlight_historical_ledger'));
    
    state.currentUser = null;
    state.isShiftActive = false;
    state.authMode = 'CHECK';
    state.activeTargetEmail = '';

    updateInventoryUI();
    updateStaffAndLoginUI();
    updateSalesAndExpensesUI();
    switchAnalyticsSection('staff');
}

// Fire Bootloader
initializeApplication();