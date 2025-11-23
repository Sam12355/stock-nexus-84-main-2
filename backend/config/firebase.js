const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  let serviceAccount;
  
  // Try to load from environment variable first (for production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Loaded Firebase credentials from environment variable');
  } else {
    // Fallback to local file (for development)
    serviceAccount = require('./firebase-service-account.json');
    console.log('✅ Loaded Firebase credentials from local file');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.error('💡 Make sure FIREBASE_SERVICE_ACCOUNT environment variable is set on Render');
}

module.exports = admin;
