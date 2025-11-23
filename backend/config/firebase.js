const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
try {
  const serviceAccount = require('./firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
}

module.exports = admin;
