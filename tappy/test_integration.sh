#!/bin/bash

# Integration test script for Tappy with Browser Use Skills

set -e

echo "=========================================="
echo "Tappy Integration Test"
echo "=========================================="

API_URL="http://localhost:8000"

# Test 1: Health check
echo -e "\n[1/5] Testing API health..."
curl -s "$API_URL/" | jq '.'

# Test 2: Create journal entry (no skill trigger)
echo -e "\n[2/5] Testing journal entry (no skill)..."
curl -s -X POST "$API_URL/journal" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Had a nice walk today. The weather was beautiful.",
    "content_json": "{\"blocks\": [{\"type\": \"paragraph\", \"data\": {\"text\": \"Had a nice walk today.\"}}]}"
  }' | jq '.plan.should_act, .plan.reason'

# Test 3: Create journal entry (job search)
echo -e "\n[3/5] Testing journal entry with job search skill..."
curl -s -X POST "$API_URL/journal" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Looking for Python engineer jobs in San Francisco",
    "content_json": "{\"blocks\": [{\"type\": \"paragraph\", \"data\": {\"text\": \"Looking for Python engineer jobs in San Francisco\"}}]}"
  }' | jq '.plan.skill_name, .plan.should_act, .execution.status'

# Test 4: List inbox items
echo -e "\n[4/5] Listing inbox items..."
curl -s "$API_URL/inbox" | jq 'length, .[0].title'

# Test 5: List journal entries
echo -e "\n[5/5] Listing journal entries..."
curl -s "$API_URL/journal" | jq 'length, .[0].title'

echo -e "\n=========================================="
echo "✓ Integration tests complete!"
echo "=========================================="
