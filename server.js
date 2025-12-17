// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const { sendNotification } = require('./notificationService');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---

// Middleware to parse JSON bodies
app.use(express.json());

// A simple middleware to check if the user is an admin
const adminOnly = (req, res, next) => {
    if (req.header('x-user-role') === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admins only.' });
    }
};

// --- Daily Book API Endpoints (Database Version) ---

// Get all entries (public)
app.get('/api/daily-book', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM daily_book_entries ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error reading daily book:', error);
        res.status(500).json({ message: 'Error reading daily book' });
    }
});

// Add a new entry (admin only)
app.post('/api/daily-book', adminOnly, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }
        const { rows } = await db.query(
            'INSERT INTO daily_book_entries (content) VALUES ($1) RETURNING *', 
            [content]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error adding daily book entry:', error);
        res.status(500).json({ message: 'Error adding entry' });
    }
});

// Update an entry (admin only)
app.put('/api/daily-book/:id', adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'Content is required' });
        }
        const { rows } = await db.query(
            'UPDATE daily_book_entries SET content = $1, updated_at = now() WHERE id = $2 RETURNING *',
            [content, id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Entry not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating daily book entry:', error);
        res.status(500).json({ message: 'Error updating entry' });
    }
});

// Delete an entry (admin only)
app.delete('/api/daily-book/:id', adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM daily_book_entries WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Entry not found' });
        }
        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting daily book entry:', error);
        res.status(500).json({ message: 'Error deleting entry' });
    }
});


// --- Customer API Endpoints ---

// Get all customers
app.get('/api/customers', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM customers ORDER BY name');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Error fetching customers' });
    }
});

// Get a single customer by ID
app.get('/api/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Error fetching customer' });
    }
});

// Add a new customer
app.post('/api/customers', adminOnly, async (req, res) => {
    try {
        const { name, phone, address, email } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }
        const { rows } = await db.query(
            'INSERT INTO customers (name, phone, address, email) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, phone, address, email]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Error adding customer' });
    }
});

// Update a customer
app.put('/api/customers/:id', adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address, email } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }
        const { rows } = await db.query(
            'UPDATE customers SET name = $1, phone = $2, address = $3, email = $4 WHERE id = $5 RETURNING *',
            [name, phone, address, email, id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: 'Error updating customer' });
    }
});

// Delete a customer
app.delete('/api/customers/:id', adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM customers WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ message: 'Error deleting customer' });
    }
});


// API endpoint for recording a sale (Transactional Version)
app.post('/api/sale', adminOnly, async (req, res) => {
    const { saleItems, customerId, paymentType } = req.body;

    if (!saleItems || saleItems.length === 0) {
        return res.status(400).json({ message: 'Sale must include at least one item.' });
    }
    if (paymentType === 'debt' && !customerId) {
        return res.status(400).json({ message: 'A customer must be selected for a debt sale.' });
    }

    const totalAmount = saleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // We use a client from the pool to run multiple queries in a single transaction
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Insert into sales table
        const saleQuery = 'INSERT INTO sales (customer_id, total_amount, payment_type) VALUES ($1, $2, $3) RETURNING id';
        const saleResult = await client.query(saleQuery, [customerId, totalAmount, paymentType]);
        const newSaleId = saleResult.rows[0].id;

        // 2. Insert into sale_items table
        for (const item of saleItems) {
            const saleItemQuery = 'INSERT INTO sale_items (sale_id, item_name, quantity, price_per_item) VALUES ($1, $2, $3, $4)';
            await client.query(saleItemQuery, [newSaleId, item.name, item.quantity, item.price]);
        }

        // 3. If it's a debt sale, insert into debts table
        if (paymentType === 'debt') {
            const debtQuery = 'INSERT INTO debts (customer_id, sale_id, total_debt) VALUES ($1, $2, $3)';
            await client.query(debtQuery, [customerId, newSaleId, totalAmount]);
        }

        // 4. Update inventory (This part is tricky as inventory is in localStorage)
        // For now, we assume the frontend handles the inventory update.
        // In a full database-driven system, inventory would also be in a DB table
        // and we would run UPDATE queries here.
        
        await client.query('COMMIT');
        
        // Send notification
        sendNotification({
            title: `فرۆشتنێکی نوێ (${paymentType === 'debt' ? 'قەرز' : 'نەقد'})`,
            message: `بڕی ${totalAmount.toLocaleString()} IQD بۆ کڕیار ID: ${customerId || 'نەناسراو'}`
        });

        res.status(201).json({ message: 'Sale recorded successfully!', saleId: newSaleId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording sale:', error);
        res.status(500).json({ message: 'Failed to record sale.' });
    } finally {
        client.release();
    }
});

// API endpoint for recording a purchase
app.post('/api/purchase', (req, res) => {
    const purchaseRecord = req.body;
    
    console.log("--- New Purchase Recorded ---");
    console.log(`  - Item: ${purchaseRecord.itemName}`);
    console.log(`  - Quantity: ${purchaseRecord.quantity}`);
    console.log(`  - Purchase Price: ${purchaseRecord.purchasePrice}`);
    console.log(`  - Vendor: ${purchaseRecord.vendor || 'N/A'}`);
    console.log("-----------------------------");

    // Trigger the push notification
    sendNotification({
        title: 'کڕینێکی نوێ تۆمارکرا',
        message: `کاڵا: ${purchaseRecord.itemName}\nژمارە: ${purchaseRecord.quantity}\nنرخی کڕین: ${purchaseRecord.purchasePrice.toLocaleString()} IQD\nفرۆشیار: ${purchaseRecord.vendor || 'نەزانراو'}`
    });
    
    res.json({ message: 'Purchase recorded successfully' });
});


// --- Static File Serving ---

// Serve files from a 'resources' directory
app.use('/resources', express.static(path.join(__dirname, 'resources')));

// Serve main css and js files
app.use('/style.css', express.static(path.join(__dirname, 'style.css')));
app.use('/main.js', express.static(path.join(__dirname, 'main.js')));
app.use('/notificationService.js', express.static(path.join(__dirname, 'notificationService.js')));


// Protected page routes
app.get('/reports.html', adminOnly, (req, res) => {
    res.sendFile(path.join(__dirname, 'reports.html'));
});

// This should be done for all pages that require login
// For simplicity, we are only protecting reports.html for now as requested
app.get('/admin.html', adminOnly, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});


// Serve all other HTML files (assumed to be public or handled by frontend auth)
// This is a catch-all, but specific protected routes above will be matched first.
app.get('/:pageName.html', (req, res, next) => {
    // This is a simple check to avoid serving protected files accidentally
    const fileName = path.basename(req.path);
    if (fileName === 'reports.html' || fileName === 'admin.html') {
        // This will happen if the user is not an admin, as the specific routes above were not matched.
        return res.status(403).send('Access Denied');
    }
    res.sendFile(path.join(__dirname, req.path));
});

// Serve the index page as the default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});