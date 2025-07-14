#!/bin/bash

# Zip-City Lookup - Test Script
# Tests the Cloudflare Worker API endpoints

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Testing Zip-City Lookup Worker${NC}"
echo

# Base URL - change this to your deployed worker URL or custom domain
BASE_URL="http://localhost:8787"  # For local development
# BASE_URL="https://zipcity.iwpi.com"  # For production

echo -e "${YELLOW}Testing US ZIP lookup...${NC}"

# Test 1: Valid lookup - Burlington, WI
echo -e "\n1. Testing valid lookup: Burlington, WI"
RESPONSE=$(curl -s "${BASE_URL}/api/us?city=Burlington&state=WI")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"zip":"53105"'; then
    echo -e "${GREEN}✅ Test 1 PASSED${NC}"
else
    echo -e "${RED}❌ Test 1 FAILED${NC}"
fi

# Test 2: Case insensitive lookup
echo -e "\n2. Testing case insensitive lookup: burlington, wi"
RESPONSE=$(curl -s "${BASE_URL}/api/us?city=burlington&state=wi")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"zip":"53105"'; then
    echo -e "${GREEN}✅ Test 2 PASSED${NC}"
else
    echo -e "${RED}❌ Test 2 FAILED${NC}"
fi

# Test 3: Not found
echo -e "\n3. Testing not found: NonExistentCity, ZZ"
RESPONSE=$(curl -s "${BASE_URL}/api/us?city=NonExistentCity&state=ZZ")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"error":"Not found"'; then
    echo -e "${GREEN}✅ Test 3 PASSED${NC}"
else
    echo -e "${RED}❌ Test 3 FAILED${NC}"
fi

# Test 4: Missing parameters
echo -e "\n4. Testing missing parameters"
RESPONSE=$(curl -s "${BASE_URL}/api/us?city=Burlington")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"error":"Missing required parameters"'; then
    echo -e "${GREEN}✅ Test 4 PASSED${NC}"
else
    echo -e "${RED}❌ Test 4 FAILED${NC}"
fi

# Test 5: Invalid route
echo -e "\n5. Testing invalid route"
RESPONSE=$(curl -s "${BASE_URL}/api/invalid")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"error":"Not found"'; then
    echo -e "${GREEN}✅ Test 5 PASSED${NC}"
else
    echo -e "${RED}❌ Test 5 FAILED${NC}"
fi

echo -e "\n${YELLOW}🏁 Testing complete!${NC}"
echo
echo -e "${YELLOW}Example curl commands:${NC}"
echo "curl -s \"${BASE_URL}/api/us?city=Burlington&state=WI\""
echo "curl -s \"${BASE_URL}/api/us?city=Chicago&state=IL\""
echo "curl -s \"${BASE_URL}/api/us?city=Austin&state=TX\""
