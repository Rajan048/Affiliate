const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('CRITICAL ERROR: JWT_SECRET not found in environment variables.');
    process.exit(1);
}

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Invalid or expired session' });
        req.user = user;
        next();
    });
};

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(uploadDir));

// Validation Rules
const productValidation = [
    body('title').notEmpty().withMessage('Title is required').trim().escape(),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('link').isURL().withMessage('Valid product link is required')
];

// Connection test route
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({ message: 'Database connected successfully!', result: rows[0].result });
    } catch (err) {
        console.error('Database connection test failed:', err);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// API Routes
app.get('/products', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Export Products (Admin only via JWT)
app.get('/export-products', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/products', authenticateToken, upload.single('image'), productValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, price, category, link } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : req.body.image;

    try {
        const [result] = await db.query(
            'INSERT INTO products (title, price, image, link, category) VALUES (?, ?, ?, ?, ?)',
            [title, price, imagePath, link, category]
        );
        res.status(201).json({ id: result.insertId, title, price, image: imagePath, link, category });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.put('/products/:id', authenticateToken, upload.single('image'), productValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { title, price, category, link } = req.body;
    
    let imagePath = req.body.image;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    try {
        await db.query(
            'UPDATE products SET title = ?, price = ?, image = ?, link = ?, category = ? WHERE id = ?',
            [title, price, imagePath, link, category, id]
        );
        res.json({ id, title, price, image: imagePath, link, category });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Click tracking (Public)
app.post('/track-click', async (req, res) => {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: 'Missing product_id' });
    try {
        await db.query('INSERT INTO clicks (product_id) VALUES (?)', [product_id]);
        res.status(201).json({ message: 'Click recorded' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Analytics Stats
app.get('/stats', async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.title, COUNT(c.id) as click_count 
            FROM products p 
            LEFT JOIN clicks c ON p.id = c.product_id 
            GROUP BY p.id
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ success: true, token, user: { id: user.id, username: user.username } });
        } else {
            res.status(401).json({ success: false, error: 'Invalid password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Internal system error' });
    }
});

// Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/store.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
