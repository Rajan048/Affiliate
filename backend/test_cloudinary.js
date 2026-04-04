const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Testing Cloudinary Connection...');
cloudinary.api.ping()
  .then(res => {
    console.log(' Connection Successful:', res);
    process.exit();
  })
  .catch(err => {
    console.error(' Connection Failed:', err);
    process.exit(1);
  });
