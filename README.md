# Velixa Affiliate Archive

A premium, full-stack affiliate product showcase platform featuring a modern "Glassmorphic Noir" design system, real-time analytics, and a robust administrative core.

## ✨ Features

- **Storefront**: High-impact hero section, smooth category filtering, and immersive product cards.
- **Admin Dashboard**: Real-time performance analytics (clicks tracking), product inventory management (CRUD), and secure data export.
- **Secure Backend**: Node.js/Express with JWT authentication and MySQL persistence.
- **Premium Design**: Built with pure CSS, Outfit typography, and glassmorphic UI components.

## 🛠️ Prerequisites

- **Node.js**: v16+
- **MySQL Server**: 8.0+
- **NPM**: Package manager

## 🚀 Quick Start

### 1. Database Setup
Ensure MySQL is running and create the database:
```sql
CREATE DATABASE affiliate_db;
```
Then execute the schema found in `backend/schema.sql`.

### 2. Configuration
Copy `backend/.env.example` to `backend/.env` and fill in your credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=affiliate_db
JWT_SECRET=a_long_random_string
```

### 3. Installation & Seeding
```bash
cd backend
npm install
node setup_db.js  # Optional, if not already done via schema.sql
node seed.js      # Seed trial products and admin user (admin/admin123)
```

### 4. Run the Server
```bash
node server.js
```
The platform will be available at http://localhost:5000.

## 📁 Project Structure

```text
├── backend/
│   ├── .env            # Environment secrets
│   ├── db.js           # Database pool configuration
│   ├── server.js       # Express application & API endpoints
│   ├── schema.sql      # Database structure
│   └── seed.js         # Initial data population
└── frontend/           # Static assets (HTML/CSS/JS)
    ├── index.html      # Public storefront (Primary Entry)
    ├── admin.html      # Protected administrative axis
    └── uploads/        # Product imagery storage
```

## 🔒 Security

- All administrative endpoints are protected via JWT tokens.
- Passwords are encrypted using Bcrypt (10 salts).
- Input validation is enforced on a per-field basis using Express Validator.

---
© 2026 Velixa CORE SYSTEMS.
