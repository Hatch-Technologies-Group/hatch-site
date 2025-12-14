#!/bin/bash

# Simple test script for agent invite flow
# Tests the invite creation endpoint directly

API_URL="http://localhost:4000/api/v1"
ORG_ID="org-hatch"
BROKER_ID="user-broker"
TEST_EMAIL="test-agent-$(date +%s)@example.com"

echo "🧪 Testing Cognito Agent Invite Flow (Simple)"
echo "============================================================"
echo ""

# First, let's test if we can register a new user and get a token
echo "📝 Step 1: Creating temporary admin user to get auth token..."

# Try to use the existing broker or create a test token
# For testing, we'll create a simple payload and manually sign it
# This is just for testing - in production, proper auth is required

echo "⚠️  Note: This test requires valid authentication."
echo "    Please provide a valid access token or login first."
echo ""
echo "To get a token, you can:"
echo "  1. Login via the frontend and copy the token from DevTools"
echo "  2. Use Postman to call POST /api/v1/auth/login"
echo "  3. Or register a new user and use their token"
echo ""

# Let's try to login with different credentials
echo "Trying to login as broker@hatchcrm.test..."

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "broker@hatchcrm.test",
    "password": "password123"
  }')

echo "Login response: $LOGIN_RESPONSE"
echo ""

# Check if we got a token
if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
  echo "✅ Login successful!"
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  echo "Token: ${ACCESS_TOKEN:0:50}..."
  echo ""

  # Now test invite creation
  echo "📧 Step 2: Creating agent invite..."
  INVITE_RESPONSE=$(curl -s -X POST "$API_URL/organizations/$ORG_ID/invites" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{
      \"email\": \"$TEST_EMAIL\"
    }")

  echo "Invite response: $INVITE_RESPONSE"
  echo ""

  if echo "$INVITE_RESPONSE" | grep -q "token"; then
    echo "✅ Invite created successfully!"

    # Extract invite token
    INVITE_TOKEN=$(echo "$INVITE_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    # Generate Cognito URL
    COGNITO_DOMAIN="${COGNITO_DOMAIN:-https://us-east-28xfagdiwk.auth.us-east-2.amazoncognito.com}"
    CLIENT_ID="${COGNITO_CLIENT_ID:-1nv2o77gk4h0tmf317oouo317k}"

    CALLBACK_URL="${COGNITO_CALLBACK_URL:-}"
    if [ -z "$CALLBACK_URL" ]; then
      BASE_REDIRECT="${COGNITO_REDIRECT_URI:-http://localhost:3000}"
      BASE_REDIRECT="${BASE_REDIRECT%/}"
      if [[ "$BASE_REDIRECT" == *"/api/v1/auth/cognito/callback" ]]; then
        CALLBACK_URL="$BASE_REDIRECT"
      elif [[ "$BASE_REDIRECT" == *"/api/v1" ]]; then
        CALLBACK_URL="${BASE_REDIRECT}/auth/cognito/callback"
      else
        CALLBACK_URL="${BASE_REDIRECT}/api/v1/auth/cognito/callback"
      fi
    fi

    urlencode() {
      python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$1"
    }

    STATE_JSON="{\"inviteToken\":\"$INVITE_TOKEN\"}"
    STATE=$(echo -n "$STATE_JSON" | base64 | tr -d '\n' | tr '+/' '-_' | tr -d '=')

    ENCODED_CALLBACK_URL=$(urlencode "$CALLBACK_URL")
    ENCODED_STATE=$(urlencode "$STATE")
    ENCODED_EMAIL=$(urlencode "$TEST_EMAIL")

    SIGNUP_URL="${COGNITO_DOMAIN}/signup?client_id=${CLIENT_ID}&response_type=code&scope=openid+email&redirect_uri=${ENCODED_CALLBACK_URL}&state=${ENCODED_STATE}&login_hint=${ENCODED_EMAIL}"

    echo ""
    echo "🔗 Cognito Signup URL:"
    echo "$SIGNUP_URL"
    echo ""
    echo "✅ Test completed successfully!"
  else
    echo "❌ Failed to create invite"
    echo "Response: $INVITE_RESPONSE"
  fi
else
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  echo "Debug info:"
  echo "  - Check if broker user exists in database"
  echo "  - Check if passwordHash is set correctly"
  echo "  - Try logging in via Postman or the frontend first"
fi

echo ""
echo "============================================================"
