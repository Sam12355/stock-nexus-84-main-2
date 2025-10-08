FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Create uploads directory
RUN mkdir -p uploads/receipts

EXPOSE 5000

CMD ["npm", "start"]
