#!/bin/bash

echo "🚀 Deploying to GitHub Pages..."

# Build the project
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

# Navigate to dist folder
cd dist

# Initialize git if not already
if [ ! -d .git ]; then
  git init
  git checkout -b gh-pages
fi

# Add all files
git add -A

# Commit
git commit -m "Deploy: $(date)"

# Push to gh-pages branch
git push -f https://github.com/tmor104/stock.git gh-pages:gh-pages

echo "✅ Deployed successfully!"
echo "🌐 Visit: https://tmor104.github.io/stock/"

cd ..
