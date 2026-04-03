const db = require('./db');
const bcrypt = require('bcryptjs');

const SAMPLE_PRODUCTS = [
  {title:'Sony WH-1000XM5', price: 24990, image: '🎧', link: 'https://amzn.to/sony- headphones', category: 'tech'},
  {title:'boAt Airdopes 141', price: 999, image: '🎵', link: 'https://amzn.to/boat-airdopes', category: 'tech'},
  {title:'Levi\'s 511 Slim Jeans', price: 3299, image: '👖', link: 'https://amzn.to/levis-jeans', category: 'fashion'},
  {title:'Campus Casual Sneakers', price: 1299, image: '👟', link: 'https://amzn.to/campus-sneakers', category: 'fashion'},
  {title:'Philips Hue Smart Bulb', price: 2499, image: '💡', link: 'https://amzn.to/philips-hue', category: 'home'},
  {title:'Instacuppa French Press', price: 1299, image: '☕', link: 'https://amzn.to/instacuppa', category: 'home'},
  {title:'Boldfit Resistance Bands', price: 449, image: '💪', link: 'https://amzn.to/boldfit-bands', category: 'fitness'},
  {title:'Boldfit Yoga Mat 6mm', price: 699, image: '🧘', link: 'https://amzn.to/boldfit-mat', category: 'fitness'},
];

async function seed() {
  console.log('Seeding database...');
  try {
    // Seed User
    const adminPass = 'admin123';
    const hashedPass = await bcrypt.hash(adminPass, 10);
    await db.query('INSERT IGNORE INTO users (username, password) VALUES (?, ?)', ['admin', hashedPass]);
    console.log('Admin user seeded (Username: admin, Password: admin123 [hashed])');

    // Seed Products
    // Clear existing products first to avoid duplicates or old schema data if table was just created
    await db.query('DELETE FROM products');
    
    for (const p of SAMPLE_PRODUCTS) {
      await db.query(
        'INSERT INTO products (title, price, image, link, category) VALUES (?, ?, ?, ?, ?)',
        [p.title, p.price, p.image, p.link, p.category]
      );
      console.log(`Inserted product: ${p.title}`);
    }
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    process.exit();
  }
}

seed();
