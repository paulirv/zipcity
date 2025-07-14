#!/bin/bash

# Production Test Script for zipcity.iwpi.com
# Tests the live API endpoints

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Testing Production API: zipcity.iwpi.com${NC}"
echo

# Production URL
BASE_URL="https://zipcity.iwpi.com"

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

# Test 3: Different city
echo -e "\n3. Testing different city: Chicago, IL"
RESPONSE=$(curl -s "${BASE_URL}/api/us?city=Chicago&state=IL")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"zip":"60601"'; then
    echo -e "${GREEN}✅ Test 3 PASSED${NC}"
else
    echo -e "${RED}❌ Test 3 FAILED${NC}"
fi

echo -e "\n${YELLOW}Testing Canada postal code lookup...${NC}"

# Test 4: Valid Canada lookup - Toronto, ON
echo -e "\n4. Testing valid Canada lookup: Toronto, ON"
RESPONSE=$(curl -s "${BASE_URL}/api/ca?city=Toronto&province=ON")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"postal_code":"M5A"'; then
    echo -e "${GREEN}✅ Test 4 PASSED${NC}"
else
    echo -e "${RED}❌ Test 4 FAILED${NC}"
fi

# Test 5: Case insensitive Canada lookup
echo -e "\n5. Testing case insensitive Canada lookup: toronto, on"
RESPONSE=$(curl -s "${BASE_URL}/api/ca?city=toronto&province=on")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"postal_code":"M5A"'; then
    echo -e "${GREEN}✅ Test 5 PASSED${NC}"
else
    echo -e "${RED}❌ Test 5 FAILED${NC}"
fi

# Test 6: Not found
echo -e "\n6. Testing not found: NonExistentCity, ZZ"
RESPONSE=$(curl -s "${BASE_URL}/api/us?city=NonExistentCity&state=ZZ")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"error":"Not found"'; then
    echo -e "${GREEN}✅ Test 6 PASSED${NC}"
else
    echo -e "${RED}❌ Test 6 FAILED${NC}"
fi

echo -e "\n${YELLOW}🏁 Production testing complete!${NC}"
echo
echo -e "${YELLOW}Production API Examples:${NC}"
echo "curl -s \"https://zipcity.iwpi.com/api/us?city=Burlington&state=WI\""
echo "curl -s \"https://zipcity.iwpi.com/api/us?city=Chicago&state=IL\""
echo "curl -s \"https://zipcity.iwpi.com/api/us?city=Austin&state=TX\""
echo "curl -s \"https://zipcity.iwpi.com/api/ca?city=Toronto&province=ON\""
echo "curl -s \"https://zipcity.iwpi.com/api/ca?city=Vancouver&province=BC\""
