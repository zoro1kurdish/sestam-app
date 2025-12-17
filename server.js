// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { sendNotification } = require('./notificationService');

const app = express();
const port = process.env.PORT || 3000;
const DAILY_BOOK_PATH = path.join(__dirname, 'daily-book.json');

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

// --- API Endpoints ---

// Helper function to read daily book entries
const readDailyBook = async () => {
    try {
        const data = await fs.readFile(DAILY_BOOK_PATH, 'utf8');
        // If the file is empty, return an empty array to avoid JSON parsing errors.
        if (data.trim() === '') {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist, return an empty array.
        if (error.code === 'ENOENT') {
            return [];
        }
        // If there's any other error (like corrupted JSON), log it and return an empty array to prevent a crash.
        console.error('Error reading or parsing daily-book.json:', error);
        return [];
    }
};

// Helper function to write daily book entries
const writeDailyBook = async (data) => {
    await fs.writeFile(DAILY_BOOK_PATH, JSON.stringify(data, null, 2), 'utf8');
};

// --- Daily Book API Endpoints ---

// Get all entries (public)
app.get('/api/daily-book', async (req, res) => {
    try {
        const entries = await readDailyBook();
        res.json(entries);
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
        const entries = await readDailyBook();
        const newEntry = {
            id: Date.now(), // Use timestamp as a simple unique ID
            timestamp: new Date().toISOString(),
            content: content
        };
        entries.push(newEntry);
        await writeDailyBook(entries);
        res.status(201).json(newEntry);
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
        const entries = await readDailyBook();
        const entryIndex = entries.findIndex(e => e.id == id);
        if (entryIndex === -1) {
            return res.status(404).json({ message: 'Entry not found' });
        }
        entries[entryIndex].content = content;
        entries[entryIndex].updatedAt = new Date().toISOString();
        await writeDailyBook(entries);
        res.json(entries[entryIndex]);
    } catch (error) {
        console.error('Error updating daily book entry:', error);
        res.status(500).json({ message: 'Error updating entry' });
    }
});

// Delete an entry (admin only)
app.delete('/api/daily-book/:id', adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const entries = await readDailyBook();
        const newEntries = entries.filter(e => e.id != id);
        if (entries.length === newEntries.length) {
            return res.status(404).json({ message: 'Entry not found' });
        }
        await writeDailyBook(newEntries);
        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting daily book entry:', error);
        res.status(500).json({ message: 'Error deleting entry' });
    }
});


// API endpoint for recording a sale
app.post('/api/sale', (req, res) => {
    const saleItems = req.body; // Expects an array of items
    
    console.log("--- New Sale Recorded ---");
    if (Array.isArray(saleItems)) {
        let totalSaleAmount = 0;
        let saleSummary = "";

        saleItems.forEach(item => {
            console.log(`  - Item: ${item.name}, Quantity: ${item.quantity}, Price: ${item.price}`);
            totalSaleAmount += item.price * item.quantity;
            saleSummary += `${item.quantity} x ${item.name}\n`;
        });
        console.log("-------------------------");

        // Send a single notification for the entire sale
        sendNotification({
            title: 'فرۆشتنێکی نوێ تۆمارکرا',
            message: `کۆی گشتی فرۆش: ${totalSaleAmount.toLocaleString()} IQD\n\n${saleSummary.trim()}`
        });

        res.json({ message: 'Sale array processed successfully' });
    } else {
        // Fallback for single item
        const { item, quantity, price } = req.body;
        console.log(`  - Item: ${item}, Quantity: ${quantity}, Price: ${price}`);
        console.log("-------------------------");
        sendNotification({
            title: 'فرۆشتنێکی تاك تۆمارکرا',
            message: `${quantity} x ${item} بە نرخی ${price}`
        });
        res.json({ message: 'Single sale item processed successfully' });
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