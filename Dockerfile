# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies first (needed for build)
RUN npm ci

# Install build tools globally
RUN npm install -g typescript tsc-alias

# Copy source code
COPY . .

# Generate Prisma client (needed for build)
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# # Remove dev dependencies and build tools to reduce image size
# RUN npm prune --production && npm uninstall -g typescript tsc-alias

# Expose the port your app runs on (adjust if different)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
# CMD ["./docker-entry.sh"]