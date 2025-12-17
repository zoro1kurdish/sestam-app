// Main JavaScript file for the Modern Accounting System


// --- FAKE DATABASES ---
/**
 * Initializes the application's data (users, inventory) in localStorage if it's not already present.
 * This ensures that a first-time user has a working set of sample data.
 */
function initializeData() {
    // Initialize Users
    if (!localStorage.getItem('users')) {
        const initialUsers = {
            "admin": { password: "admin", role: "admin", name: "ئادمین" },
            "user": { password: "user", role: "user", name: "بەکارهێنەر" }
        };
        localStorage.setItem('users', JSON.stringify(initialUsers));
    }

    // Initialize Inventory
    if (!localStorage.getItem('inventory')) {
        const sampleInventory = [
            { id: 'PROD-001', name: 'کۆمپیوتەری لاپتۆپ Dell XPS 15', quantity: 25, price: 1800000, purchasePrice: 1650000 },
            { id: 'PROD-002', name: 'مۆبایلی iPhone 15 Pro', quantity: 8, price: 1500000, purchasePrice: 1400000 },
            { id: 'PROD-003', name: 'ماوسی بێ وایەر Logitech', quantity: 112, price: 45000, purchasePrice: 35000 },
            { id: 'PROD-004', name: 'کەوەرتی Samsung 4K TV 55-inch', quantity: 2, price: 950000, purchasePrice: 850000 }
        ];
        localStorage.setItem('inventory', JSON.stringify(sampleInventory));
    }
}

/**
 * Retrieves users from localStorage.
 * @returns {object} The users object.
 */
function getUsers() {
    const storedUsers = localStorage.getItem('users');
    return storedUsers ? JSON.parse(storedUsers) : {};
}


// --- CORE FUNCTIONS ---

/**
 * A wrapper for the native fetch function that automatically adds authentication headers.
 * @param {string} url - The URL to fetch.
 * @param {object} options - The options for the fetch request.
 * @returns {Promise<Response>} - A promise that resolves to the response.
 */
async function fetchWithAuth(url, options = {}) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (currentUser && currentUser.role) {
        headers['x-user-role'] = currentUser.role;
    }

    const fetchOptions = {
        ...options,
        headers,
    };

    return fetch(url, fetchOptions);
}


/**
 * Handles the login form submission.
 */
function handleLogin() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const users = getUsers();
        const user = users[username];

        if (user && user.password === password) {
            // Save user session
            localStorage.setItem('currentUser', JSON.stringify({ username: username, role: user.role, name: user.name }));
            // Redirect to dashboard
            window.location.href = 'index.html';
        } else {
            // Show error message
            showAlert('ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە!', 'danger');
        }
    });
}

/**
 * Checks if a user is logged in. If not, redirects to the login page.
 * This should be called on all pages except login.html.
 */
function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return null;
    }
    return currentUser;
}

/**
 * Logs the user out by clearing the session and redirecting to the login page.
 */
function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}


/**
 * Applies Role-Based Access Control by hiding/showing elements and redirecting users.
 * @param {object} currentUser - The currently logged-in user object.
 */
function applyRBAC(currentUser) {
    if (!currentUser) return;

    const isAdmin = currentUser.role === 'admin';
    const pathname = window.location.pathname;

    // Menu links
    const adminOnlyLinks = ['admin.html', 'reports.html', 'user-management.html'];
    adminOnlyLinks.forEach(page => {
        const link = document.querySelector(`a[href="${page}"]`);
        if (link && !isAdmin) {
            link.style.display = 'none';
        }
    });

    // Page access
    const adminOnlyPages = ['/admin.html', '/reports.html', '/user-management.html'];
    if (!isAdmin && adminOnlyPages.some(page => pathname.endsWith(page))) {
        window.location.href = 'index.html'; // Redirect to a safe page
    }
    
    // Special case for daily-book: all users can see it, but only admins can edit.
    // The editing UI is handled within handleDailyBookPage().
}

/**
 * Updates the UI with the current user's name and sets up the logout button.
 * @param {object} currentUser - The currently logged-in user object.
 */
function updateUserUI(currentUser) {
    if (!currentUser) return;

    // Update user name in the header
    const userNameElement = document.querySelector('.user-info span');
    if (userNameElement) {
        userNameElement.textContent = currentUser.name;
    }

    // Add event listener to the logout button
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
}

/**
 * Displays a dismissible alert message.
 * @param {string} message - The message to display.
 * @param {string} type - The Bootstrap alert type (e.g., 'success', 'danger').
 */
function showAlert(message, type) {
    const placeholder = document.getElementById('alert-placeholder');
    if (!placeholder) {
        // If the placeholder is not on the page, just use a standard browser alert
        alert(message);
        return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible" role="alert">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('');

    placeholder.append(wrapper);

    // Automatically dismiss the alert after 5 seconds
    setTimeout(() => {
        wrapper.remove();
    }, 5000);
}
// --- SALES PAGE FUNCTIONS ---

/**
 * Handles all logic for the sales page (POS system).
 */
function handleSalesPage() {
    // Existing POS elements
    const productSelect = document.getElementById('product-select');
    const productListContainer = document.getElementById('product-list-container');
    const posForm = document.getElementById('pos-form');
    const quantityInput = document.getElementById('quantity-input');
    const invoiceItems = document.getElementById('invoice-items');
    const invoiceTotalEl = document.getElementById('invoice-total');
    const finalizeSaleBtn = document.getElementById('finalize-sale-btn');
    const printReceiptBtn = document.getElementById('print-receipt-btn');

    // New Customer & Payment elements
    const customerSelect = document.getElementById('customer-select');
    const addNewCustomerBtn = document.getElementById('add-new-customer-btn');
    const paymentDebtRadio = document.getElementById('payment-debt');
    const customerModalEl = document.getElementById('customer-modal');
    const customerModal = new bootstrap.Modal(customerModalEl);
    const customerForm = document.getElementById('customer-form');
    const customerModalTitle = document.getElementById('customer-modal-title');
    const customerIdInput = document.getElementById('customer-id');

    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let currentSale = []; // Array to hold items in the current invoice

    const formatCurrency = (number) => new Intl.NumberFormat('en-US').format(number) + ' IQD';

    function renderProducts() {
        productSelect.innerHTML = '<option selected disabled>کاڵایەک هەڵبژێرە...</option>';
        productListContainer.innerHTML = '';
        inventory.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${formatCurrency(product.price)})`;
            productSelect.appendChild(option);
            const productCard = document.createElement('div');
            productCard.className = 'col-12';
            productCard.innerHTML = `
                <div class="card card-body-hover" data-product-id="${product.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="card-title mb-1">${product.name}</h6>
                            <p class="card-text text-muted mb-0">${formatCurrency(product.price)}</p>
                        </div>
                        <span class="badge bg-primary">${product.quantity} دانە</span>
                    </div>
                </div>
            `;
            productListContainer.appendChild(productCard);
            productCard.addEventListener('click', () => {
                productSelect.value = product.id;
                quantityInput.focus();
            });
        });
    }

    function renderInvoice() {
        invoiceItems.innerHTML = '';
        let total = 0;
        currentSale.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(itemTotal)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger remove-item-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            invoiceItems.appendChild(row);
        });
        invoiceTotalEl.textContent = formatCurrency(total);
        attachRemoveItemListeners();
    }

    function attachRemoveItemListeners() {
        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', function() {
                const indexToRemove = parseInt(this.getAttribute('data-index'));
                currentSale.splice(indexToRemove, 1);
                renderInvoice();
            });
        });
    }

    // --- New Customer Logic ---
    async function populateCustomersDropdown() {
        try {
            const response = await fetchWithAuth('/api/customers');
            const customers = await response.json();
            // Clear existing options but keep the first "Anonymous" one
            customerSelect.options.length = 1; 
            customers.forEach(customer => {
                const option = new Option(`${customer.name} (${customer.phone || 'بێ ژمارە'})`, customer.id);
                customerSelect.add(option);
            });
        } catch (error) {
            console.error('Error fetching customers:', error);
            showAlert('هەڵەیەک لە هێنانی لیستی کڕیارەکان ڕوویدا', 'danger');
        }
    }

    // Enable 'debt' option only if a real customer is selected
    customerSelect.addEventListener('change', function() {
        if (this.value) { // if a customer ID is selected
            paymentDebtRadio.disabled = false;
        } else { // Anonymous customer
            paymentDebtRadio.disabled = true;
            document.getElementById('payment-cash').checked = true; // Default to cash
        }
    });
    
    // Handle "Add New Customer" button click
    addNewCustomerBtn.addEventListener('click', () => {
        customerForm.reset();
        customerIdInput.value = '';
        customerModalTitle.textContent = 'زیادکردنی کڕیاری نوێ';
        customerModal.show();
    });

    // Handle saving new customer from modal
    customerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerData = {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            address: document.getElementById('customer-address').value,
            email: document.getElementById('customer-email').value,
        };
        try {
            const response = await fetchWithAuth('/api/customers', {
                method: 'POST',
                body: JSON.stringify(customerData)
            });
            if (!response.ok) throw new Error('Failed to save new customer');
            const newCustomer = await response.json();
            await populateCustomersDropdown(); // Refresh dropdown
            customerSelect.value = newCustomer.id; // Auto-select the new customer
            customerSelect.dispatchEvent(new Event('change')); // Trigger change event to enable debt
            customerModal.hide();
            showAlert('کڕیاری نوێ بە سەرکەوتوویی زیادکرا', 'success');
        } catch (error) {
            console.error('Error saving new customer:', error);
            showAlert('هەڵەیەک لە زیادکردنی کڕیاری نوێ ڕوویدا', 'danger');
        }
    });
    // --- End of New Customer Logic ---


    posForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const selectedProductId = productSelect.value;
        const quantity = parseInt(quantityInput.value);
        if (!selectedProductId || !quantity || quantity <= 0) {
            showAlert('تکایە کاڵا و ژمارەی دانە بە دروستی هەڵبژێرە.', 'warning');
            return;
        }
        const product = inventory.find(p => p.id === selectedProductId);
        const itemInSale = currentSale.find(p => p.id === selectedProductId);
        const totalQuantityInSale = (itemInSale ? itemInSale.quantity : 0) + quantity;
        if (!product || product.quantity < totalQuantityInSale) {
            showAlert('بڕی داواکراو لە کۆگا زیاترە!', 'danger');
            return;
        }
        if(itemInSale) {
            itemInSale.quantity += quantity;
        } else {
             currentSale.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity
            });
        }
        renderInvoice();
        // Do not reset the entire form, just quantity and product selection
        quantityInput.value = 1;
        productSelect.value = '';
        productSelect.focus();
    });

    finalizeSaleBtn.addEventListener('click', function() {
        if (currentSale.length === 0) {
            showAlert('هیچ کاڵایەک بۆ فرۆشتن زیاد نەکراوە.', 'warning');
            return;
        }

        const customerId = customerSelect.value || null;
        const paymentType = document.querySelector('input[name="paymentType"]:checked').value;

        if (paymentType === 'debt' && !customerId) {
            showAlert('تکایە کڕیارێک هەڵبژێرە بۆ فرۆشتنی قەرز.', 'danger');
            return;
        }
        
        // The data to be sent to the server
        const saleData = {
            saleItems: currentSale,
            customerId: customerId,
            paymentType: paymentType
        };

        fetchWithAuth('/api/sale', {
            method: 'POST',
            body: JSON.stringify(saleData),
        })
        .then(response => {
            if (!response.ok) {
                 return response.json().then(err => { throw new Error(err.message || 'Network response was not ok'); });
            }
            return response.json();
        })
        .then(data => {
            // Update inventory locally
            currentSale.forEach(saleItem => {
                const inventoryItem = inventory.find(invItem => invItem.id === saleItem.id);
                if (inventoryItem) {
                    inventoryItem.quantity -= saleItem.quantity;
                }
            });
            localStorage.setItem('inventory', JSON.stringify(inventory));
            
            showAlert(data.message || 'فرۆشتن بە سەرکەوتوویی تۆمارکرا!', 'success');

            // Reset for next sale
            currentSale = [];
            renderInvoice();
            renderProducts();
            customerSelect.value = '';
            customerSelect.dispatchEvent(new Event('change'));
        })
        .catch((error) => {
            console.error('Error finalizing sale:', error);
            showAlert(`هەڵەیەک ڕوویدا: ${error.message}`, 'danger');
        });
    });

    printReceiptBtn.addEventListener('click', function() {
        if (currentSale.length === 0) {
            showAlert('هیچ کاڵایەک نییە بۆ پرێنتکردن.', 'warning');
            return;
        }
        const customerName = customerSelect.options[customerSelect.selectedIndex].text;
        const receiptWindow = window.open('', 'PRINT', 'height=600,width=800');
        receiptWindow.document.write(`
            <html>
                <head>
                    <title>وەسڵی فرۆشتن</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; }
                        .receipt-container { width: 90%; margin: auto; padding: 20px; border: 1px solid #ccc; }
                        h2, h3 { text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; }
                        th { background-color: #f2f2f2; }
                        .total { font-weight: bold; margin-top: 20px; text-align: left; }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <h2>ژمێریاری ROZ</h2>
                        <h3>وەسڵی فرۆشتن</h3>
                        <p><strong>بۆ بەڕێز:</strong> ${customerName}</p>
                        <p><strong>بەروار:</strong> ${new Date().toLocaleString('ar-IQ')}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>کاڵا</th>
                                    <th>نرخ</th>
                                    <th>دانە</th>
                                    <th>کۆی گشتی</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${currentSale.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${formatCurrency(item.price)}</td>
                                        <td>${item.quantity}</td>
                                        <td>${formatCurrency(item.price * item.quantity)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="total">
                           کۆی گشتی: ${invoiceTotalEl.textContent}
                        </div>
                    </div>
                    <script>
                        setTimeout(() => { 
                            window.print();
                            window.close();
                        }, 250);
                    </script>
                </body>
            </html>
        `);
    });

    // Initial render on page load
    renderProducts();
    populateCustomersDropdown();
}


// --- ADD ITEM PAGE FUNCTIONS ---

/**
 * Handles all logic for the "Add Item" page.
 */
function handleAddItemPage() {
    const addItemForm = document.getElementById('add-item-form');
    const itemImageInput = document.getElementById('item-image');
    const imagePreview = document.getElementById('image-preview');

    if (!addItemForm) return;

    // Handle image preview
    itemImageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // Handle form submission
    addItemForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const itemName = document.getElementById('item-name').value;
        const purchasePrice = parseFloat(document.getElementById('purchase-price').value);
        const quantity = parseInt(document.getElementById('item-quantity').value);
        const sellPrice = parseFloat(document.getElementById('item-sell-price').value);
        const imageFile = itemImageInput.files[0];

        if (!itemName || isNaN(purchasePrice) || isNaN(quantity) || isNaN(sellPrice)) {
            showAlert('تکایە هەموو خانەکان بە دروستی پڕبکەرەوە.', 'warning');
            return;
        }
        
        let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        
        const processAndSaveItem = (imageDataUrl = null) => {
            const newItem = {
                id: `PROD-${Date.now()}`, // Generate a unique ID
                name: itemName,
                quantity: quantity,
                price: sellPrice, // In sales, we use the selling price
                purchasePrice: purchasePrice,
                image: imageDataUrl
            };

            inventory.push(newItem);
            localStorage.setItem('inventory', JSON.stringify(inventory));

            showAlert('کاڵاکە بە سەرکەوتوویی زیادکرا!', 'success');
            addItemForm.reset();
            imagePreview.style.display = 'none';
        };

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                processAndSaveItem(e.target.result);
            }
            reader.readAsDataURL(imageFile);
        } else {
            processAndSaveItem(); // Save without an image
        }
    });
}


// --- ADMIN PAGE FUNCTIONS ---

/**
 * Creates a backup of the application data.
 * This function gathers all relevant data from localStorage, creates a JSON object,
 * and triggers a download of the data as a .json file.
 */
function handleBackup() {
    const backupData = {};
    
    // Iterate over all keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // We can add a check here to exclude certain keys if needed
        if (key) {
            backupData[key] = localStorage.getItem(key);
        }
    }

    // Convert the backup data to a JSON string
    const jsonString = JSON.stringify(backupData, null, 2);
    
    // Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a link element to trigger the download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Set the file name for the download
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    link.download = `sestam-backup-${dateString}.json`;
    
    // Append the link to the body, click it, and then remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('یەدەگ بە سەرکەوتوویی دروستکرا!', 'success');
}

/**
 * Handles the file selection and data restoration process.
 * @param {Event} e - The file input change event.
 */
function handleRestore(e) {
    const file = e.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const backupData = JSON.parse(event.target.result);
            
            // Clear existing localStorage before restoring
            // We should ask for confirmation here as well
            if (!confirm('ئایا دڵنیایت لە گەڕاندنەوەی ئەم یەدەگە؟ هەموو داتای ئێستا دەسڕێتەوە.')) {
                return;
            }
            
            localStorage.clear();

            // Restore data from the backup file
            for (const key in backupData) {
                // Ensure we are restoring to our own localStorage
                if (Object.prototype.hasOwnProperty.call(backupData, key)) {
                    // The data is already in string format, which is what localStorage expects
                    localStorage.setItem(key, backupData[key]);
                }
            }

            showAlert('داتا بە سەرکەوتوویی گەڕێندرایەوە! سیستەمەکە دووبارە دادەخرێتەوە.', 'success');
            
            // Reload the page to apply the changes
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            showAlert('هەڵەیەک ڕوویدا لە کاتی گەڕاندنەوەی داتا. دڵنیابە فایلەکە دروستە.', 'danger');
            console.error("Restore error: ", error);
        }
    };
    reader.readAsText(file);
}

function handleAdminActions() {
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    let actionToConfirm = null;

    document.querySelector('.main-content').addEventListener('click', function(event) {
        const target = event.target.closest('button');
        if (!target) return;

        switch (target.id) {
            case 'reset-data-btn':
                showConfirmationModal('Are you sure you want to reset all data? This action cannot be undone.', () => resetApplicationData(target));
                break;
            case 'backup-btn':
                handleBackup(target);
                break;
            case 'restore-btn':
                document.getElementById('restore-file-input').click();
                break;
            case 'system-settings-btn':
                showAlert('ئەم بەشە لە ژێر کارکردندایە', 'info');
                break;
        }
    });

    document.getElementById('restore-file-input').addEventListener('change', (e) => {
        showConfirmationModal('Are you sure you want to restore from this backup? All current data will be overwritten.', () => handleRestore(e));
    });

    confirmActionBtn.addEventListener('click', () => {
        if (actionToConfirm) {
            actionToConfirm();
        }
        confirmationModal.hide();
    });

    function showConfirmationModal(message, callback) {
        document.getElementById('confirmationModalBody').textContent = message;
        actionToConfirm = callback;
        confirmationModal.show();
    }

    function handleBackup(button) {
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...`;

        setTimeout(() => {
            const backupData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    backupData[key] = localStorage.getItem(key);
                }
            }
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const today = new Date();
            const dateString = today.toISOString().split('T')[0];
            link.download = `sestam-backup-${dateString}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showAlert('یەدەگ بە سەرکەوتوویی دروستکرا!', 'success');
            button.disabled = false;
            button.innerHTML = originalText;
        }, 500); // Simulate a short delay for user feedback
    }

    function handleRestore(e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const backupData = JSON.parse(event.target.result);
                localStorage.clear();
                for (const key in backupData) {
                    if (Object.prototype.hasOwnProperty.call(backupData, key)) {
                        localStorage.setItem(key, backupData[key]);
                    }
                }
                showAlert('داتا بە سەرکەوتوویی گەڕێندرایەوە! سیستەمەکە دووبارە دادەخرێتەوە.', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                showAlert('هەڵەیەک ڕوویدا لە کاتی گەڕاندنەوەی داتا. دڵنیابە فایلەکە دروستە.', 'danger');
                console.error("Restore error: ", error);
            }
        };
        reader.readAsText(file);
    }

    function resetApplicationData(button) {
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...`;

        setTimeout(() => {
            localStorage.removeItem('inventory');
            localStorage.removeItem('currentUser');
            alert('هەموو داتاکان بە سەرکەوتوویی سفرکرانەوە. سیستەمەکە دووبارە دادەخرێتەوە.');
            window.location.href = 'login.html';
        }, 500);
    }
}
function handlePurchasesPage() {
    const purchaseForm = document.getElementById('purchase-form');
    if (!purchaseForm) return;

    const itemSelect = document.getElementById('purchase-item-select');
    const newItemNameGroup = document.getElementById('new-item-name-group');
    const newItemNameInput = document.getElementById('new-item-name');
    const quantityInput = document.getElementById('purchase-quantity');
    const purchasePriceInput = document.getElementById('purchase-price');
    const sellPriceInput = document.getElementById('item-sell-price');
    const vendorInput = document.getElementById('purchase-vendor');
    const imageInput = document.getElementById('purchase-image');
    const imagePreview = document.getElementById('image-preview');

    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];

    // Populate the dropdown with existing inventory items
    function populateInventoryDropdown() {
        // Clear existing options before populating
        const existingOptions = itemSelect.querySelectorAll('option:not([value="--new-item--"])');
        existingOptions.forEach(opt => {
             if(opt.disabled === false) opt.remove();
        });

        inventory.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            // Insert before the "Add New" option
            itemSelect.insertBefore(option, itemSelect.querySelector('option[value="--new-item--"]'));
        });
    }

    // Show/hide the new item name field based on dropdown selection
    itemSelect.addEventListener('change', function() {
        if (this.value === '--new-item--') {
            newItemNameGroup.style.display = 'block';
            newItemNameInput.required = true;
        } else {
            newItemNameGroup.style.display = 'none';
            newItemNameInput.required = false;
            // Optional: Populate form with data of selected existing item
            const selectedItem = inventory.find(item => item.id === this.value);
            if(selectedItem) {
                purchasePriceInput.value = selectedItem.purchasePrice || '';
                sellPriceInput.value = selectedItem.price || '';
            }
        }
    });

    // Handle image preview
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // Handle form submission
    purchaseForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const selectedItemId = itemSelect.value;
        const isNewItem = selectedItemId === '--new-item--';
        const itemName = isNewItem ? newItemNameInput.value.trim() : itemSelect.options[itemSelect.selectedIndex].text;
        const quantity = parseInt(quantityInput.value);
        const purchasePrice = parseFloat(purchasePriceInput.value);
        const sellPrice = parseFloat(sellPriceInput.value);
        const vendor = vendorInput.value.trim();
        const imageFile = imageInput.files[0];

        if (!itemName || isNaN(quantity) || quantity <= 0 || isNaN(purchasePrice) || isNaN(sellPrice)) {
            showAlert('تکایە دڵنیابە لە پڕکردنەوەی هەموو خانە پێویستەکان (ناو، ژمارە، نرخی کڕین، نرخی فرۆشتن).', 'warning');
            return;
        }

        const processAndSave = (imageDataUrl = null) => {
            let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
            
            if (isNewItem) {
                // Add a completely new item to inventory
                const newItem = {
                    id: `PROD-${Date.now()}`,
                    name: itemName,
                    quantity: quantity,
                    price: sellPrice,
                    purchasePrice: purchasePrice,
                    vendor: vendor, // Also save the vendor
                    image: imageDataUrl
                };
                inventory.push(newItem);
            } else {
                // Update an existing item
                const itemIndex = inventory.findIndex(item => item.id === selectedItemId);
                if (itemIndex > -1) {
                    inventory[itemIndex].quantity += quantity;
                    // Update prices and image if they were changed
                    inventory[itemIndex].purchasePrice = purchasePrice;
                    inventory[itemIndex].price = sellPrice;
                    if(vendor) inventory[itemIndex].vendor = vendor;
                    if(imageDataUrl) inventory[itemIndex].image = imageDataUrl;
                }
            }
            
            // Save updated inventory and a record of the purchase
            localStorage.setItem('inventory', JSON.stringify(inventory));
            
            // --- Save a record of the purchase ---
            let purchases = JSON.parse(localStorage.getItem('purchases')) || [];
            const purchaseRecord = {
                purchaseId: `PUR-${Date.now()}`,
                itemId: isNewItem ? inventory[inventory.length - 1].id : selectedItemId,
                itemName: itemName,
                quantity: quantity,
                purchasePrice: purchasePrice,
                vendor: vendor,
                date: new Date().toISOString()
            };
            purchases.push(purchaseRecord);
            localStorage.setItem('purchases', JSON.stringify(purchases));

            // --- Send purchase data to the server ---
            fetchWithAuth('/api/purchase', {
                method: 'POST',
                body: JSON.stringify(purchaseRecord),
            })
            .then(response => response.json())
            .then(data => console.log('Server response:', data.message))
            .catch((error) => console.error('Error sending purchase to server:', error));
            // ------------------------------------

            showAlert('کڕینەکە بە سەرکەوتوویی تۆمارکرا و کۆگا نوێکرایەوە!', 'success');
            purchaseForm.reset();
            imagePreview.style.display = 'none';
            newItemNameGroup.style.display = 'none';
            itemSelect.value = itemSelect.options[0].value;
            // Repopulate dropdown to include the new item if one was added
            if (isNewItem) {
                 populateInventoryDropdown();
            }
        };

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (e) => processAndSave(e.target.result);
            reader.readAsDataURL(imageFile);
        } else {
            // If it's an existing item and no new image is provided, keep the old one
            const existingItem = inventory.find(item => item.id === selectedItemId);
            const existingImageData = existingItem ? existingItem.image : null;
            processAndSave(existingImageData);
        }
    });

    // Initial population of the dropdown
    populateInventoryDropdown();
}

function handleInventoryPage() {
    const inventoryTableBody = document.querySelector('.table-custom tbody');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const editItemModal = new bootstrap.Modal(document.getElementById('editItemModal'));
    const editItemForm = document.getElementById('edit-item-form');
    const editItemId = document.getElementById('edit-item-id');
    const editItemName = document.getElementById('edit-item-name');
    const editItemQuantity = document.getElementById('edit-item-quantity');
    const editItemPrice = document.getElementById('edit-item-price');

    function renderInventory() {
        const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        inventoryTableBody.innerHTML = ''; // Clear existing table data

        if (inventory.length === 0) {
            inventoryTableBody.innerHTML = '<tr><td colspan="6" class="text-center">هیچ کاڵایەک لە کۆگا نییە.</td></tr>';
            return;
        }

        inventory.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>دانە</td>
                <td><span class="badge bg-${item.quantity > 10 ? 'success' : (item.quantity > 0 ? 'warning' : 'danger')}">${item.quantity}</span></td>
                <td>${new Intl.NumberFormat('en-US').format(item.price)} IQD</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary info-item-btn" data-id="${item.id}"><i class="fas fa-info-circle"></i></button>
                    <button class="btn btn-sm btn-outline-secondary edit-item-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-item-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            inventoryTableBody.appendChild(row);
        });

        attachActionListeners();
    }

    function attachActionListeners() {
        const infoButtons = document.querySelectorAll('.info-item-btn');
        const editButtons = document.querySelectorAll('.edit-item-btn');
        const deleteButtons = document.querySelectorAll('.delete-item-btn');
        
        const inventory = JSON.parse(localStorage.getItem('inventory')) || [];

        infoButtons.forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                const item = inventory.find(i => i.id === itemId);
                if (item) {
                    const purchasePrice = item.purchasePrice ? `${new Intl.NumberFormat('en-US').format(item.purchasePrice)} IQD` : 'نەزانراوە';
                    showAlert(`زانیاری کاڵا:\nنرخی کڕین: ${purchasePrice}`, 'info');
                }
            });
        });

        editButtons.forEach(button => {
            if (currentUser && currentUser.role === 'admin') {
                button.addEventListener('click', function() {
                    const itemId = this.getAttribute('data-id');
                    const item = inventory.find(i => i.id === itemId);
                    if (item) {
                        editItemId.value = item.id;
                        editItemName.value = item.name;
                        editItemQuantity.value = item.quantity;
                        editItemPrice.value = item.price;
                        editItemModal.show();
                    }
                });
            } else {
                button.disabled = true;
                button.classList.add('disabled');
            }
        });

        deleteButtons.forEach(button => {
            if (currentUser && currentUser.role === 'admin') {
                button.addEventListener('click', function() {
                    const itemId = this.getAttribute('data-id');
                    if (confirm('ئایا دڵنیایت لە سڕینەوەی ئەم کاڵایە؟')) {
                        deleteItem(itemId);
                    }
                });
            } else {
                button.disabled = true;
                button.classList.add('disabled');
            }
        });
    }

    function deleteItem(itemId) {
        let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        inventory = inventory.filter(item => item.id !== itemId);
        localStorage.setItem('inventory', JSON.stringify(inventory));
        renderInventory();
        showAlert('کاڵاکە بە سەرکەوتوویی سڕایەوە.', 'success');
    }
    
    editItemForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const itemId = editItemId.value;
        let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        const itemIndex = inventory.findIndex(item => item.id === itemId);

        if (itemIndex > -1) {
            inventory[itemIndex].name = editItemName.value;
            inventory[itemIndex].quantity = parseInt(editItemQuantity.value, 10);
            inventory[itemIndex].price = parseFloat(editItemPrice.value);
            
            localStorage.setItem('inventory', JSON.stringify(inventory));
            renderInventory();
            editItemModal.hide();
            showAlert('گۆڕانکارییەکان بە سەرکەوتوویی پاشەکەوتکران.', 'success');
        } else {
            showAlert('هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردنی گۆڕانکارییەکان.', 'danger');
        }
    });

    // Initial render
    renderInventory();
}

function handleUserManagementPage() {
    const userTableBody = document.querySelector('.table-custom tbody');
    const addUserForm = document.getElementById('add-user-form');
    const newUsernameInput = document.getElementById('new-username');
    const newPasswordInput = document.getElementById('new-password');
    const newNameInput = document.getElementById('new-name');
    const newRoleInput = document.getElementById('new-role');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    function renderUsers() {
        const storedUsers = getUsers();
        userTableBody.innerHTML = '';

        for (const username in storedUsers) {
            const user = storedUsers[username];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${username}</td>
                <td>${user.name}</td>
                <td>${user.role === 'admin' ? 'ئادمین' : 'بەکارهێنەر'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-user-btn" data-username="${username}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            userTableBody.appendChild(row);
        }
        attachDeleteListeners();
    }

    function attachDeleteListeners() {
        const deleteButtons = document.querySelectorAll('.delete-user-btn');
        deleteButtons.forEach(button => {
            const usernameToDelete = button.getAttribute('data-username');
            if (currentUser && currentUser.username === usernameToDelete) {
                button.disabled = true; // Admin cannot delete themselves
                button.classList.add('disabled');
            } else {
                button.addEventListener('click', function() {
                    if (confirm(`ئایا دڵنیایت لە سڕینەوەی بەکارهێنەر '${usernameToDelete}'؟`)) {
                        deleteUser(usernameToDelete);
                    }
                });
            }
        });
    }

    function deleteUser(username) {
        let storedUsers = getUsers();
        delete storedUsers[username];
        localStorage.setItem('users', JSON.stringify(storedUsers));
        renderUsers();
        showAlert('بەکارهێنەر بە سەرکەوتوویی سڕایەوە.', 'success');
    }

    addUserForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newUsername = newUsernameInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const newName = newNameInput.value.trim();
        const newRole = newRoleInput.value;
        
        let storedUsers = getUsers();

        if (storedUsers[newUsername]) {
            showAlert('ئەم ناوەی بەکارهێنەر پێشتر بەکارهاتووە.', 'danger');
            return;
        }

        storedUsers[newUsername] = {
            password: newPassword,
            role: newRole,
            name: newName
        };

        localStorage.setItem('users', JSON.stringify(storedUsers));
        renderUsers();
        addUserForm.reset();
        showAlert('بەکارهێنەری نوێ بە سەرکەوتوویی زیادکرا.', 'success');
    });
    
    // Initial setup
    renderUsers();
}

// --- DAILY BOOK PAGE FUNCTIONS ---
function handleDailyBookPage() {
    const form = document.getElementById('daily-book-form');
    const contentInput = document.getElementById('entry-content');
    const entriesTbody = document.getElementById('daily-book-entries');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isAdmin = currentUser.role === 'admin';

    // Disable form for non-admins
    if (!isAdmin) {
        if(form) form.style.display = 'none';
    }

    async function loadEntries() {
        try {
            const response = await fetchWithAuth('/api/daily-book');
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Could not read error body');
                console.error(`Failed to fetch entries. Status: ${response.status}. Body: ${errorText}`);
                throw new Error(`Failed to fetch with status: ${response.status}`);
            }
            
            const entries = await response.json();

            entriesTbody.innerHTML = '';
            entries.sort((a, b) => b.id - a.id); // Show newest first

            const actionsHeader = document.querySelector('thead th:last-child');
            if (actionsHeader && !isAdmin) {
                actionsHeader.style.display = 'none';
            }


            entries.forEach((entry, index) => {
                const row = document.createElement('tr');
                row.dataset.id = entry.id;
                
                let actionsCell = '';
                if (isAdmin) {
                    actionsCell = `
                    <td>
                        <button class="btn btn-sm btn-outline-secondary edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>`;
                } else {
                    // Add an empty cell to keep the column alignment if the header is not hidden
                     if (actionsHeader && actionsHeader.style.display !== 'none') {
                        actionsCell = '<td></td>';
                     }
                }


                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="content-cell">${entry.content}</td>
                    <td>${new Date(entry.timestamp).toLocaleString('ar-IQ')}</td>
                    ${actionsCell}
                `;
                entriesTbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading entries:', error);
            showAlert('هەڵەیەک ڕوویدا لە کاتی هێنانی تۆمارەکان.', 'danger');
        }
    }

    if (isAdmin) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = contentInput.value.trim();
            if (!content) return;

            try {
                const response = await fetchWithAuth('/api/daily-book', {
                    method: 'POST',
                    body: JSON.stringify({ content })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save entry');
                }
                contentInput.value = '';
                showAlert('تۆمار بە سەرکەوتوویی زیادکرا.', 'success');
                loadEntries(); // Refresh the list
            } catch (error) {
                console.error('Error adding entry:', error);
                showAlert(`هەڵەیەک ڕوویدا: ${error.message}`, 'danger');
            }
        });

        entriesTbody.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const row = target.closest('tr');
            const id = row.dataset.id;

            // --- Delete Action ---
            if (target.classList.contains('delete-btn')) {
                if (!confirm('ئایا دڵنیایت لە سڕینەوەی ئەم تۆمارە؟')) return;
                
                try {
                    const response = await fetchWithAuth(`/api/daily-book/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Failed to delete');
                    row.remove();
                    showAlert('تۆمارەکە سڕایەوە.', 'success');
                } catch (error) {
                    console.error('Error deleting entry:', error);
                    showAlert('هەڵەیەک ڕوویدا لە کاتی سڕینەوە.', 'danger');
                }
            }
            
            // --- Edit Action ---
            else if (target.classList.contains('edit-btn')) {
                const contentCell = row.querySelector('.content-cell');
                contentCell.innerHTML = `
                    <textarea class="form-control">${contentCell.textContent}</textarea>
                `;
                target.innerHTML = '<i class="fas fa-save"></i>';
                target.classList.replace('edit-btn', 'save-btn');
                target.classList.replace('btn-outline-secondary', 'btn-outline-success');
            }

            // --- Save Action (after edit) ---
            else if (target.classList.contains('save-btn')) {
                const newContent = row.querySelector('textarea').value;
                 try {
                    const response = await fetchWithAuth(`/api/daily-book/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ content: newContent })
                    });

                    if (!response.ok) throw new Error('Failed to update');
                    
                    showAlert('تۆمارەکە نوێکرایەوە.', 'success');
                    loadEntries(); // Easiest way to reset the UI state

                } catch (error) {
                    console.error('Error updating entry:', error);
                    showAlert('هەڵەیەک ڕوویدا لە کاتی نوێکردنەوە.', 'danger');
                    loadEntries(); // Revert changes on failure
                }
            }
        });
    }

    loadEntries();
}


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', function () {
    initializeData(); // Ensure data is initialized on every page load

    const isLoginPage = window.location.pathname.endsWith('login.html');
    
    if (isLoginPage) {
        handleLogin();
    } else {
        const currentUser = checkAuth();
        if (currentUser) {
            applyRBAC(currentUser);
            updateUserUI(currentUser);

            // --- Sidebar Toggle Logic ---
            const sidebar = document.querySelector('.sidebar');
            const sidebarToggle = document.getElementById('sidebar-toggle');
            const sidebarOverlay = document.querySelector('.sidebar-overlay');

            if (sidebar && sidebarToggle && sidebarOverlay) {
                sidebarToggle.addEventListener('click', () => {
                    sidebar.classList.add('show');
                    sidebarOverlay.classList.add('show');
                });

                sidebarOverlay.addEventListener('click', () => {
                    sidebar.classList.remove('show');
                    sidebarOverlay.classList.remove('show');
                });
            }

            const pathname = window.location.pathname;

            if (pathname.endsWith('sales.html')) {
                handleSalesPage();
            } else if (pathname.endsWith('add-items.html')) {
                handleAddItemPage();
            } else if (pathname.endsWith('inventory.html')) {
                handleInventoryPage();
            } else if (pathname.endsWith('user-management.html')) {
                handleUserManagementPage();
            } else if (pathname.endsWith('admin.html')) {
                handleAdminActions();
            } else if (pathname.endsWith('purchases.html')) {
                handlePurchasesPage();
            } else if (pathname.endsWith('daily-book.html')) {
                handleDailyBookPage();
            }
        }
    }
});
