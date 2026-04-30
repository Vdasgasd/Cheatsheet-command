FROM node:20-alpine

WORKDIR /app

# Copy package.json dan install dependency
COPY package*.json ./
RUN npm install --production

# Copy sisa kode (server.js dan folder public)
COPY . .

# Expose port yang digunakan Express (80)
EXPOSE 80

CMD ["node", "server.js"]








