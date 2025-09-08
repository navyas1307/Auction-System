#!/bin/bash
# Keep the service warm by pinging it every 10 minutes

# Your app URL - replace with your actual Render URL
APP_URL="https://mini-auction-system.onrender.com"

# Ping the app to keep it warm
echo "Pinging $APP_URL to keep service warm..."
response=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL/api/test)

if [ $response -eq 200 ]; then
    echo "✅ Service pinged successfully at $(date) - Response: $response"
else
    echo "⚠️ Service responded with code $response at $(date)"
fi
