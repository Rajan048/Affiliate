const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

// Performance & Security Foundation
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// Production Safety Check (Critical)
const REQUIRED_ENV = [
    'JWT_SECRET',
    'DATABASE_URL',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

REQUIRED_ENV.forEach(v => {
    if (!process.env[v]) {
        console.error(`[CRITICAL_FAILURE] Missing environment variable: ${v}`);
        process.exit(1);
    }
});

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'affiliate_products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    },
});
const upload = multer({ storage });

// Rate Limiters (Hardening)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, 
    message: { success: false, error: 'Maximum attempts exceeded. Please try again later.' }
});

const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50, 
    message: { success: false, error: 'Too many operations. Please wait.' }
});

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

// Serve static files with aggressive 1-year caching
const cacheOptions = {
    maxAge: '1y',
    immutable: true,
    etag: true
};
app.use(express.static(path.join(__dirname, '../frontend'), cacheOptions));

// Validation Rules
const productValidation = [
    body('title').notEmpty().withMessage('Title is required').trim().escape(),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('link').isURL().withMessage('Valid product link is required'),
    body('description').optional().trim().escape()
];

// Routes
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({ message: 'Database connected!', result: rows[0].result });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Product API
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/products', authenticateToken, writeLimiter, upload.single('image'), productValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { title, price, category, link, description } = req.body;
    const imagePath = req.file ? req.file.path : req.body.image;

    try {
        const [rows] = await db.query(
            'INSERT INTO products (title, price, image, link, category, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [title, price, imagePath, link, category, description]
        );
        res.status(201).json({ id: rows[0].id, title, price, image: imagePath, link, category, description });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.put('/api/products/:id', authenticateToken, writeLimiter, upload.single('image'), productValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { id } = req.params;
    const { title, price, category, link, description } = req.body;
    let imagePath = req.body.image;
    if (req.file) imagePath = req.file.path;

    try {
        await db.query(
            'UPDATE products SET title = $1, price = $2, image = $3, link = $4, category = $5, description = $6 WHERE id = $7',
            [title, price, imagePath, link, category, description, id]
        );
        res.json({ id, title, price, image: imagePath, link, category, description });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/products/:id', authenticateToken, writeLimiter, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Analytics (Harden with rate limiters if needed)
app.post('/api/track-click', async (req, res) => {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: 'Missing product_id' });
    try {
        await db.query('INSERT INTO clicks (product_id) VALUES ($1)', [product_id]);
        res.status(201).json({ message: 'Click recorded' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.title, p.category, CAST(COUNT(c.id) AS INTEGER) as click_count 
            FROM products p 
            LEFT JOIN clicks c ON p.id = c.product_id 
            GROUP BY p.id, p.title, p.category
            ORDER BY click_count DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin-Only Backup/Export API
app.get('/api/export-products', authenticateToken, async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products ORDER BY id DESC');
        const [stats] = await db.query(`
            SELECT p.id, CAST(COUNT(c.id) AS INTEGER) as click_count 
            FROM products p 
            LEFT JOIN clicks c ON p.id = c.product_id 
            GROUP BY p.id
        `);
        
        const exportData = products.map(p => ({
            ...p,
            analytics: stats.find(s => s.id === p.id) || { click_count: 0 }
        }));
        
        res.json(exportData);
    } catch (err) {
        res.status(500).json({ error: 'Export failure' });
    }
});

// Authentication
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (rows.length === 0) return res.status(401).json({ success: false, error: 'Access denied' });
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ success: true, token, user: { id: user.id, username: user.username } });
        } else {
            res.status(401).json({ success: false, error: 'Invalid password' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal error' });
    }
});

// Fallback & Error Handling
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((err, req, res, next) => {
    console.error(`[INTERNAL_ERROR]:`, err);
    res.status(500).json({
        success: false,
        error: 'Critical system synchronization failure. The archive remains secure.'
    });
});

const server = app.listen(PORT, () => {
    console.log(`[CORE_ACTIVE] Velixa Platform running on port ${PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received. Closing server...');
    server.close(() => {
        console.log('Server closed. Database pool remains managed by driver.');
        process.exit(0);
    });
});
