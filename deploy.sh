#!/bin/bash

echo "Starting deployment..."

# Stop script if any command fails
set -e

echo "Pulling latest code from git..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Building TypeScript..."
npm run build

echo "Cleaning old build if needed..."
# rimraf dist (uncomment if needed)

echo "Starting server..."
npm run start

echo "Deployment completed successfully!"