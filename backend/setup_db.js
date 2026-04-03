const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
    });

    console.log('Connecting to MySQL...');

    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'affiliate_db'}`);
        await connection.query(`USE ${process.env.DB_NAME || 'affiliate_db'}`);

        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const queries = schema.split(';').filter(q => q.trim() !== '');

        for (let query of queries) {
            await connection.query(query);
            console.log('Executed query:', query.substring(0, 50) + '...');
        }

        console.log('Database setup complete.');
    } catch (err) {
        console.error('Error during setup:', err);
    } finally {
        await connection.end();
    }
}

setup();
