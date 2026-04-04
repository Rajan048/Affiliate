const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const bcrypt = require('bcryptjs');

const SAMPLE_PRODUCTS = [
    { title: 'Sony WH-1000XM5', price: 24990, image: '🎧', link: 'https://amzn.to/sony-headphones', category: 'tech', description: 'Industry-leading noise cancellation and atmospheric pressure optimization.' },
    { title: 'boAt Airdopes 141', price: 999, image: '🎵', link: 'https://amzn.to/boat-airdopes', category: 'tech', description: 'Up to 42 hours of total playtime with ASAP Charge technology.' },
    { title: 'Levi\'s 511 Slim Jeans', price: 3299, image: '👖', link: 'https://amzn.to/levis-jeans', category: 'fashion', description: 'A modern slim with room to move. The definitive slim fit for all-day comfort.' },
    { title: 'Campus Casual Sneakers', price: 1299, image: '👟', link: 'https://amzn.to/campus-sneakers', category: 'fashion', description: 'Lightweight design with breathable mesh for daily urban versatility.' },
    { title: 'Philips Hue Smart Bulb', price: 2499, image: '💡', link: 'https://amzn.to/philips-hue', category: 'home', description: 'Million colors and shades of white to transform your living space.' },
    { title: 'Instacuppa French Press', price: 1299, image: '☕', link: 'https://amzn.to/instacuppa', category: 'home', description: 'Brew professional-grade coffee with a 4-level filtration system.' },
    { title: 'Boldfit Resistance Bands', price: 449, image: '💪', link: 'https://amzn.to/boldfit-bands', category: 'fitness', description: 'Premium latex construction for varied intensity strength training.' },
    { title: 'Boldfit Yoga Mat 6mm', price: 699, image: '🧘', link: 'https://amzn.to/boldfit-mat', category: 'fitness', description: 'Anti-skid TPE material with alignment lines for perfect posture.' },
];

async function migrate() {
    console.log(' Starting Neon PostgreSQL Migration...');

    try {
        // Read schema
        const schemaPath = path.join(__dirname, 'schema_pg.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log(' Applying schema...');
        await pool.query(schemaSql);
        console.log('Schema applied successfully.');

        // Seed Admin User
        console.log(' Seeding admin user...');
        const adminPass = 'admin123';
        const hashedPass = await bcrypt.hash(adminPass, 10);
        await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
            ['admin', hashedPass]
        );
        console.log(' Admin user created (admin / admin123).');

        // Seed Products
        console.log(' Seeding products...');
        await pool.query('DELETE FROM products'); // Clear for clean start
        for (const p of SAMPLE_PRODUCTS) {
            await pool.query(
                'INSERT INTO products (title, price, image, link, category, description) VALUES ($1, $2, $3, $4, $5, $6)',
                [p.title, p.price, p.image, p.link, p.category, p.description]
            );
        }
        console.log(` ${SAMPLE_PRODUCTS.length} products seeded.`);

        console.log('\n Migration complete! Your Neon database is now ready.');
    } catch (err) {
        console.error(' Migration failed:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();
