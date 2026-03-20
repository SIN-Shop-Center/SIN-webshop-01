#!/bin/bash
set -e
echo "Deploying Go API to Hugging Face Space..."
cd /Users/jeremy/dev/projects/family-projects/simone-webshop-01/apps/api

# Get HF token using Python helper
TOKEN=$(python3 -c "import json,os; d=json.load(open(os.path.expanduser('~/.config/sin-solver/authd/state.json'))); print(next((a['accessToken'] for a in d.get('accounts', []) if a.get('providerId') == 'huggingface'), ''))")

if [ -z "$TOKEN" ]; then
    echo "ERROR: Could not extract HF token from authd"
    exit 1
fi

# We use the existing Dockerfile.hf
cp Dockerfile.hf Dockerfile

# Init git and push to HF space
rm -rf .git-hf
mkdir .git-hf
cp -r * .git-hf/ 2>/dev/null || true
cd .git-hf
git init
git checkout -b main
rm Dockerfile.hf
git add .
git commit -m "Deploy Go API to Hugging Face Space"
git push -f https://oauth2:${TOKEN}@huggingface.co/spaces/delqhi/simone-webshop-api main

echo "Pushed to Hugging Face successfully!"
