# Use an official Node runtime as a parent image
FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Vite exposes port 5173 by default
EXPOSE 5173

# Define environment variable
ENV NODE_ENV=production

RUN pnpm run build

# New Container for production
FROM nginx:latest

WORKDIR /app

COPY --from=builder /app/dist .

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


