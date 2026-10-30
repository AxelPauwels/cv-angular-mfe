#!/bin/bash
echo "🔧 Starting production build..."

npx nx build cv-mfe --configuration=production
