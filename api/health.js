// Simple API endpoint for GitHub Pages
// This file will be served as a static file

const healthData = {
  status: "OK",
  timestamp: new Date().toISOString(),
  environment: "github-pages",
  message: "Stock Nexus API is running on GitHub Pages"
};

// Return as JSON
console.log(JSON.stringify(healthData, null, 2));
