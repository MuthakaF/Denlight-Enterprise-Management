/**
 * Denlight - Advanced Enterprise Dashboard Storage Engine Architecture
 */

// --- Persistent Application Engine LocalStorage Defaults ---
function getInitialInventory() {
    return [
        { id: "1", name: "Anker USB-C Hub", buyingPrice: 15.00, qty: 25, soldVolume: 0 },
        { id: "2", name: "Logitech MX Master 3S", buyingPrice: 65.00, qty: 10, soldVolume: 0 },
        { id: "3", name: "iPhone 15 Matte Case", buyingPrice: 4.50, qty: 50, soldVolume: 0 }
    ];
}

function getInitialStaff() {
    return ["Alex", "Jordan", "Taylor", "Morgan"];
}

if (!localStorage.getItem('denlight_inventory')) {
    localStorage.setItem('denlight_inventory', JSON.stringify(getInitialInventory()));
}
if (!localStorage.getItem('denlight_staff')) {
    localStorage.setItem('denlight_staff', JSON.stringify(getInitialStaff()));
}

// --- Global Application Data Runtime States ---
let state = {
    inventory: JSON.parse(localStorage.getItem('denlight_inventory')),
    staff: JSON.parse(localStorage.getItem('denlight_staff')),
    isShiftActive: false,
    
    // Shift Data Bucket Vectors
    currentShiftSales: [],
    currentShiftExpenses: [],
    currentSalesProfitTotal: 0.00,
    currentExpensesTotal: 0.00,
    currentNetProfitTotal: 0.00,
    
    // Active Screen Tab Trackers
    activeTab: 'sales',
    activeAnalyticsSection: 'staff'
};

// --- DOM Cache System Selectors ---
const dom = {
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
    btnClockIn: document.getElementById('btn-clock-in'),
    btnClockOut: document.getElementById('btn-clock-out'),
    btnMasterReset: document.getElementById('btn-master-reset'),
    shiftStatusIndicator: document.getElementById('shift-status'),
    statusText: document.getElementById('status-text'),
    salesWarning: document.getElementById('sales-warning'),
    
    // Inventory Form Management Selectors
    inventoryForm: document.getElementById('inventory-form'),
    invActionSelect: document.getElementById('inv-action-select'),
    invNameContainer: document.getElementById('inv-name-container'),
    invName: document.getElementById('inv-name'),
    invBuyingPrice: document.getElementById('inv-buying-price'),
    invQtyLabel: document.getElementById('inv-qty-label'),
    invQty: document.getElementById('inv-qty'),
    inventoryTableBody: document.getElementById('inventory-table-body'),

    // Staff Structural DOM Element Links
    staffForm: document.getElementById('staff-form'),
    staffName: document.getElementById('staff-name'),
    staffTableBody: document.getElementById('staff-table-body'),
    
    salesForm: document.getElementById('sales-form'),
    saleItemSelect: document.getElementById('sale-item-select'),
    salePrice: document.getElementById('sale-price'),
    saleEmployee: document.getElementById('sale-employee'),
    btnAddSale: document.getElementById('btn-add-sale'),
    salesTableBody: document.getElementById('sales-table-body'),
    
    expenseForm: document.getElementById('expense-form'),
    expType: document.getElementById('exp-type'),
    expCustomContainer: document.getElementById('exp-custom-container'),
    expCustomDesc: document.getElementById('exp-custom-desc'),
    expAmount: document.getElementById('exp-amount'),
    btnAddExpense: document.getElementById('btn-add-expense'),
    expensesTableBody: document.getElementById('expenses-table-body'),
    
    statCurrentSalesProfit: document.getElementById('stat-current-sales-profit'),
    statCurrentExpenses: document.getElementById('stat-current-expenses'),
    statCurrentNetProfit: document.getElementById('stat-current-net-profit'),
    
    anBtnStaff: document.getElementById('an-btn-staff'),
    anBtnStock: document.getElementById('an-btn-stock'),
    anBtnOut: document.getElementById('an-btn-out'),
    anBtnPerformance: document.getElementById('an-btn-performance'),
    anBadgeOut: document.getElementById('an-badge-out'),
    analyticsPanelTitle: document.getElementById('analytics-panel-title'),
    analyticsTableHead: document.getElementById('analytics-table-head'),
    analyticsTableBody: document.getElementById('analytics-table-body')
};

// --- View Router Control Switches Engine Routines ---
function switchMainTab(tabKey) {
    Object.keys(dom.tabs).forEach(k => {
        dom.tabs[k].className = "tab-btn py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-semibold text-xs sm:text-sm focus:outline-none transition inline-block";
        dom.views[k].classList.add('hidden');
    });
    dom.tabs[tabKey].className = "tab-btn py-4 px-1 border-b-2 border-cyan-500 text-cyan-600 font-bold text-xs sm:text-sm focus:outline-none transition inline-block";
    dom.views[tabKey].classList.remove('hidden');
    state.activeTab = tabKey;

    // Responsive Mobile Optimization Fix: Force windows scroll level back up to top index
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabKey === 'overview') {
        renderAnalyticsViewport();
    }
}

Object.keys(dom.tabs).forEach(k => {
    dom.tabs[k].addEventListener('click', () => switchMainTab(k));
});

dom.expType.addEventListener('change', () => {
    if (dom.expType.value === 'Other') {
        dom.expCustomContainer.classList.remove('hidden');
        dom.expCustomDesc.required = true;
    } else {
        dom.expCustomContainer.classList.add('hidden');
        dom.expCustomDesc.required = false;
    }
});

// --- Dynamic Table Data Rendering Pipelines ---

function updateInventoryUI() {
    dom.inventoryTableBody.innerHTML = '';
    dom.saleItemSelect.innerHTML = '<option value="">-- Choose Stock --</option>';
    dom.invActionSelect.innerHTML = '<option value="NEW">-- Create New Product Type --</option>';
    
    let outOfStockCounter = 0;

    state.inventory.forEach(item => {
        if (!item.hasOwnProperty('soldVolume')) item.soldVolume = 0; 
        if (parseInt(item.qty) === 0) outOfStockCounter++;

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 text-gray-700 font-medium transition";
        row.innerHTML = `
            <td class="p-3 font-semibold text-gray-900 break-all">${item.name}</td>
            <td class="p-3 text-right text-gray-500">$${item.buyingPrice.toFixed(2)}</td>
            <td class="p-3 text-right font-bold ${item.qty < 5 ? 'text-rose-600 bg-rose-50':'text-gray-700'}">${item.qty} u</td>
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
            option.textContent = `${item.name} (${item.qty})`;
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
        dom.invQtyLabel.textContent = "Additional Quantity to Add";
        
        const targetItem = state.inventory.find(i => i.id === selectedValue);
        if (targetItem) {
            dom.invBuyingPrice.value = targetItem.buyingPrice;
            dom.invQty.value = "";
        }
    }
}
dom.invActionSelect.addEventListener('change', handleInventoryActionDropdownState);

window.deleteInventoryItem = function(id) {
    if (confirm("Remove this item from the Denlight database?")) {
        state.inventory = state.inventory.filter(item => item.id !== id);
        localStorage.setItem('denlight_inventory', JSON.stringify(state.inventory));
        updateInventoryUI();
        if (state.activeTab === 'overview') renderAnalyticsViewport();
    }
};

function updateStaffUI() {
    dom.staffTableBody.innerHTML = '';
    dom.saleEmployee.innerHTML = '';

    if (state.staff.length === 0) {
        dom.saleEmployee.innerHTML = '<option value="">-- No Staff Available --</option>';
        dom.staffTableBody.innerHTML = `<tr><td colspan="2" class="p-4 text-center text-gray-400">No staff registered.</td></tr>`;
        return;
    }

    state.staff.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dom.saleEmployee.appendChild(option);

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 text-gray-700 font-semibold transition";
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

window.deleteStaffMember = function(name) {
    if (confirm(`Remove ${name} from active store register structures?`)) {
        state.staff = state.staff.filter(member => member !== name);
        localStorage.setItem('denlight_staff', JSON.stringify(state.staff));
        updateStaffUI();
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

// --- Advanced Analytics Engine Viewport Switching ---

function switchAnalyticsSection(sectionKey) {
    const buttons = {
        staff: dom.anBtnStaff,
        stock: dom.anBtnStock,
        out: dom.anBtnOut,
        performance: dom.anBtnPerformance
    };
    
    Object.keys(buttons).forEach(k => {
        buttons[k].className = "text-left p-3 rounded-lg font-semibold text-xs sm:text-sm border bg-white hover:bg-gray-50 text-gray-700 transition truncate";
    });
    dom.anBtnOut.className = "text-left p-3 rounded-lg font-semibold text-xs sm:text-sm border bg-white hover:bg-gray-50 text-red-600 transition flex justify-between items-center truncate";

    if (sectionKey === 'staff') dom.anBtnStaff.className = "text-left p-3 rounded-lg font-bold text-xs sm:text-sm border bg-cyan-600 text-white shadow-sm transition truncate w-full";
    if (sectionKey === 'stock') dom.anBtnStock.className = "text-left p-3 rounded-lg font-bold text-xs sm:text-sm border bg-cyan-600 text-white shadow-sm transition truncate w-full";
    if (sectionKey === 'out') dom.anBtnOut.className = "text-left p-3 rounded-lg font-bold text-xs sm:text-sm border bg-red-600 text-white shadow-sm transition flex justify-between items-center truncate w-full";
    if (sectionKey === 'performance') dom.anBtnPerformance.className = "text-left p-3 rounded-lg font-bold text-xs sm:text-sm border bg-cyan-600 text-white shadow-sm transition truncate w-full";

    state.activeAnalyticsSection = sectionKey;
    renderAnalyticsViewport();
}

function renderAnalyticsViewport() {
    dom.analyticsTableHead.innerHTML = '';
    dom.analyticsTableBody.innerHTML = '';

    if (state.activeAnalyticsSection === 'staff') {
        dom.analyticsPanelTitle.textContent = "Employee Performance (Current Shift)";
        dom.analyticsTableHead.innerHTML = `<tr><th class="p-3">Employee Name</th><th class="p-3 text-center">Volume</th><th class="p-3 text-right">Profit</th></tr>`;
        
        if (state.staff.length === 0) {
            dom.analyticsTableBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-400">No employees registered.</td></tr>`;
            return;
        }

        state.staff.forEach(name => {
            const staffSales = state.currentShiftSales.filter(s => s.seller === name);
            const totalVolume = staffSales.length;
            const netProfit = staffSales.reduce((acc, curr) => acc + curr.profit, 0);

            const row = document.createElement('tr');
            row.innerHTML = `<td class="p-3 font-bold text-slate-900">${name}</td><td class="p-3 text-center text-gray-600 font-bold">${totalVolume} items</td><td class="p-3 text-right text-emerald-600 font-black">+$${netProfit.toFixed(2)}</td>`;
            dom.analyticsTableBody.appendChild(row);
        });
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
                row.className = "bg-rose-50/40";
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

dom.anBtnStaff.addEventListener('click', () => switchAnalyticsSection('staff'));
dom.anBtnStock.addEventListener('click', () => switchAnalyticsSection('stock'));
dom.anBtnOut.addEventListener('click', () => switchAnalyticsSection('out'));
dom.anBtnPerformance.addEventListener('click', () => switchAnalyticsSection('performance'));

// --- Core Shift Lifecycle Flow Engines Logic ---

function setShiftSystemState(active) {
    state.isShiftActive = active;
    
    dom.btnClockIn.disabled = active;
    dom.btnClockOut.disabled = !active;
    dom.saleItemSelect.disabled = !active;
    dom.salePrice.disabled = !active;
    dom.saleEmployee.disabled = !active;
    dom.btnAddSale.disabled = !active;
    dom.expType.disabled = !active;
    dom.expAmount.disabled = !active;
    dom.btnAddExpense.disabled = !active;

    if (active) {
        dom.shiftStatusIndicator.className = "inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2";
        dom.statusText.textContent = "Shift Open";
        dom.btnClockIn.classList.add('opacity-50', 'cursor-not-allowed');
        dom.btnClockOut.classList.remove('opacity-50', 'cursor-not-allowed');
        dom.btnAddSale.classList.remove('opacity-50', 'cursor-not-allowed');
        dom.btnAddExpense.classList.remove('opacity-50', 'cursor-not-allowed');
        dom.salesWarning.classList.add('hidden');
    } else {
        dom.shiftStatusIndicator.className = "inline-block w-3 h-3 rounded-full bg-red-500 mr-2";
        dom.statusText.textContent = "Shift Closed";
        dom.btnClockIn.classList.remove('opacity-50', 'cursor-not-allowed');
        dom.btnClockOut.classList.add('opacity-50', 'cursor-not-allowed');
        dom.btnAddSale.classList.add('opacity-50', 'cursor-not-allowed');
        dom.btnAddExpense.classList.add('opacity-50', 'cursor-not-allowed');
        dom.salesWarning.classList.remove('hidden');
    }
}

dom.inventoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const actionValue = dom.invActionSelect.value;
    const inputPrice = parseFloat(dom.invBuyingPrice.value);
    const inputQty = parseInt(dom.invQty.value);

    if (actionValue === 'NEW') {
        const newItem = {
            id: Date.now().toString(),
            name: dom.invName.value.trim(),
            buyingPrice: inputPrice,
            qty: inputQty,
            soldVolume: 0
        };
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
    const cleanName = dom.staffName.value.trim();
    
    if (state.staff.includes(cleanName)) {
        alert("This employee name already exists.");
        return;
    }

    state.staff.push(cleanName);
    localStorage.setItem('denlight_staff', JSON.stringify(state.staff));
    
    updateStaffUI();
    dom.staffForm.reset();
});

dom.salesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.isShiftActive) return;

    const itemId = dom.saleItemSelect.value;
    const soldPrice = parseFloat(dom.salePrice.value);
    const sellerName = dom.saleEmployee.value;

    if (!sellerName) {
        alert("Please assign an attending employee.");
        return;
    }

    const itemIndex = state.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1 || state.inventory[itemIndex].qty <= 0) return;

    const item = state.inventory[itemIndex];
    const calculatedProfit = soldPrice - item.buyingPrice;

    state.inventory[itemIndex].qty -= 1;
    state.inventory[itemIndex].soldVolume = (state.inventory[itemIndex].soldVolume || 0) + 1;
    localStorage.setItem('denlight_inventory', JSON.stringify(state.inventory));

    state.currentShiftSales.push({
        itemName: item.name,
        soldPrice: soldPrice,
        profit: calculatedProfit,
        seller: sellerName
    });
    
    state.currentSalesProfitTotal += calculatedProfit;

    updateInventoryUI();
    updateSalesAndExpensesUI();
    
    dom.saleItemSelect.value = "";
    dom.salePrice.value = "";
});

dom.expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.isShiftActive) return;

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

dom.btnClockIn.addEventListener('click', () => {
    state.currentShiftSales = [];
    state.currentShiftExpenses = [];
    state.currentSalesProfitTotal = 0.00;
    state.currentExpensesTotal = 0.00;
    state.currentNetProfitTotal = 0.00;
    
    updateSalesAndExpensesUI();
    setShiftSystemState(true);
});

dom.btnClockOut.addEventListener('click', () => {
    if (!state.isShiftActive) return;
    setShiftSystemState(false);
    switchMainTab('overview');
    alert(`Shift Closed Safely!\nNet Settled Shift Profit: $${state.currentNetProfitTotal.toFixed(2)} generated.`);
});

dom.btnMasterReset.addEventListener('click', () => {
    if (confirm("Warning: This will wipe out all session metrics. Proceed?")) {
        localStorage.removeItem('denlight_inventory');
        localStorage.removeItem('denlight_staff');
        
        state.inventory = getInitialInventory();
        state.staff = getInitialStaff();
        
        localStorage.setItem('denlight_inventory', JSON.stringify(state.inventory));
        localStorage.setItem('denlight_staff', JSON.stringify(state.staff));
        
        state.currentShiftSales = [];
        state.currentShiftExpenses = [];
        state.currentSalesProfitTotal = 0.00;
        state.currentExpensesTotal = 0.00;
        state.currentNetProfitTotal = 0.00;
        
        setShiftSystemState(false);
        updateInventoryUI();
        updateStaffUI();
        updateSalesAndExpensesUI();
        switchMainTab('sales');
        alert("System Reset Complete!");
    }
});

// --- System Initialization Bootstrapping ---
updateInventoryUI();
updateStaffUI();
updateSalesAndExpensesUI();
setShiftSystemState(false);