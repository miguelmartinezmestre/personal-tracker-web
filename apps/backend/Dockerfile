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

# Build the NestJS application (if needed, check your build process)
# RUN pnpm run build

# NestJS runs on port 3000 by default
EXPOSE 3000

# Define environment variable
ENV NODE_ENV=production

RUN pnpm run build

# Run the NestJS app in development mode
CMD ["pnpm", "run", "start:prod"] 