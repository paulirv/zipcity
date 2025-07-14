#!/bin/bash

# Zip-City Lookup - Test Script
# Tests the Cloudflare Worker API endpoints with R2 storage

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Testing Zip-City Lookup Worker (R2 Storage)${NC}"
echo

# Base URL - change this to your deployed worker URL or custom domain
BASE_URL="http://localhost:8787"  # For local development
# BASE_URL="https://zipcity.iwpi.com"  # For production (custom domain)
# BASE_URL="https://zip-city-lookup.paul-bb4.workers.dev"  # For production (workers.dev)

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

echo -e "\n${YELLOW}Testing Canada postal code lookup...${NC}"

# Test 5: Valid Canada lookup - Toronto, ON
echo -e "\n5. Testing valid Canada lookup: Toronto, ON"
RESPONSE=$(curl -s "${BASE_URL}/api/ca?city=Toronto&province=ON")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"postal_code":"M5A"'; then
    echo -e "${GREEN}✅ Test 5 PASSED${NC}"
else
    echo -e "${RED}❌ Test 5 FAILED${NC}"
fi

# Test 6: Case insensitive Canada lookup
echo -e "\n6. Testing case insensitive Canada lookup: toronto, on"
RESPONSE=$(curl -s "${BASE_URL}/api/ca?city=toronto&province=on")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"postal_code":"M5A"'; then
    echo -e "${GREEN}✅ Test 6 PASSED${NC}"
else
    echo -e "${RED}❌ Test 6 FAILED${NC}"
fi

# Test 7: Canada not found
echo -e "\n7. Testing Canada not found: NonExistentCity, ZZ"
RESPONSE=$(curl -s "${BASE_URL}/api/ca?city=NonExistentCity&province=ZZ")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"error":"Not found"'; then
    echo -e "${GREEN}✅ Test 7 PASSED${NC}"
else
    echo -e "${RED}❌ Test 7 FAILED${NC}"
fi

# Test 8: Canada missing parameters
echo -e "\n8. Testing Canada missing parameters"
RESPONSE=$(curl -s "${BASE_URL}/api/ca?city=Toronto")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"error":"Missing required parameters"'; then
    echo -e "${GREEN}✅ Test 8 PASSED${NC}"
else
    echo -e "${RED}❌ Test 8 FAILED${NC}"
fi

# Test 9: Invalid route
echo -e "\n9. Testing invalid route"
RESPONSE=$(curl -s "${BASE_URL}/api/invalid")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"error":"Not found"'; then
    echo -e "${GREEN}✅ Test 9 PASSED${NC}"
else
    echo -e "${RED}❌ Test 9 FAILED${NC}"
fi

echo -e "\n${YELLOW}🏁 Testing complete!${NC}"
echo
echo -e "${YELLOW}Example curl commands:${NC}"
echo "# US lookups:"
echo "curl -s \"https://zipcity.iwpi.com/api/us?city=Burlington&state=WI\""
echo "curl -s \"https://zipcity.iwpi.com/api/us?city=Chicago&state=IL\""
echo "curl -s \"https://zipcity.iwpi.com/api/us?city=Austin&state=TX\""
echo
echo "# Canada lookups:"
echo "curl -s \"https://zipcity.iwpi.com/api/ca?city=Toronto&province=ON\""
echo "curl -s \"https://zipcity.iwpi.com/api/ca?city=Vancouver&province=BC\""
echo "curl -s \"https://zipcity.iwpi.com/api/ca?city=Montreal&province=QC\""
