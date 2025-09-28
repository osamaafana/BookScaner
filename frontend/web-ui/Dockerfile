# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including @types/node
RUN npm install && npm install --save-dev @types/node

# Copy source code
COPY . .

# Build the app with environment variable
ARG VITE_GATEWAY_URL=http://91.98.136.8:3001
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]