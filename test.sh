#!/bin/bash

# Zip-City Lookup - Test Script
# Tests the Cloudflare Worker API endpoints against a local `wrangler dev`.
#
#   ./test.sh                                   # local dev server (port 5630)
#   BASE_URL=http://localhost:8787 ./test.sh    # any other host

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL - override with the BASE_URL environment variable
BASE_URL="${BASE_URL:-http://localhost:5630}"

PASS=0
FAIL=0

# check <number> <description> <url-path> <grep -E pattern>
check() {
    local n="$1" desc="$2" path="$3" pattern="$4"
    echo -e "\n${n}. ${desc}"
    local response
    response=$(curl -s "${BASE_URL}${path}")
    echo "Response: ${response}"
    if echo "$response" | grep -qE "$pattern"; then
        echo -e "${GREEN}✅ Test ${n} PASSED${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}❌ Test ${n} FAILED${NC}"
        FAIL=$((FAIL + 1))
    fi
}

echo -e "${YELLOW}🚀 Testing Zip-City Lookup Worker at ${BASE_URL}${NC}"
echo

echo -e "${YELLOW}Testing US ZIP lookup...${NC}"
check 1 "Valid lookup: Burlington, WI"            "/api/us?city=Burlington&state=WI" '"zip":"53105"'
check 2 "Case insensitive lookup: burlington, wi" "/api/us?city=burlington&state=wi" '"zip":"53105"'
check 3 "Not found: NonExistentCity, ZZ"          "/api/us?city=NonExistentCity&state=ZZ" '"error":"Not found"'
check 4 "Missing parameters"                      "/api/us?city=Burlington" '"error":"Missing required parameters"'
check 5 "Lookup by ZIP: 93101"                    "/api/us?zip=93101" '"city":"Santa Barbara".*"zip":"93101"'
check 6 "Lookup carries lat/lon"                  "/api/us?city=Burlington&state=WI" '"lat":-?[0-9].*"lon":-?[0-9]'

echo -e "\n${YELLOW}Testing Canada postal code lookup...${NC}"
check 7  "Valid Canada lookup: Toronto, ON"             "/api/ca?city=Toronto&province=ON" '"postal_code":"M5A"'
check 8  "Case insensitive Canada lookup: toronto, on"  "/api/ca?city=toronto&province=on" '"postal_code":"M5A"'
check 9  "Canada not found: NonExistentCity, ZZ"        "/api/ca?city=NonExistentCity&province=ZZ" '"error":"Not found"'
check 10 "Canada missing parameters"                    "/api/ca?city=Toronto" '"error":"Missing required parameters"'
check 11 "Lookup by postal code (FSA): M5A"             "/api/ca?postal=M5A" '"city":"Toronto".*"postal_code":"M5A"'
check 12 "Canada lookup carries lat/lon"                "/api/ca?city=Toronto&province=ON" '"lat":-?[0-9].*"lon":-?[0-9]'

echo -e "\n${YELLOW}Testing autocomplete...${NC}"
check 13 "US autocomplete row carries lat/lon"  "/api/autocomplete/us?q=santa%20bar&limit=1" '"city":"Santa Barbara".*"lat":-?[0-9].*"lon":-?[0-9]'
check 14 "US ZIP-prefix autocomplete carries lat/lon" "/api/autocomplete/us?q=9310&limit=1" '"type":"zipcode".*"lat":-?[0-9].*"lon":-?[0-9]'
check 15 "CA autocomplete row carries lat/lon"  "/api/autocomplete/ca?q=toron&limit=1" '"city":"Toronto".*"lat":-?[0-9].*"lon":-?[0-9]'

echo -e "\n${YELLOW}Testing routing...${NC}"
check 16 "Invalid route" "/api/invalid" '"error":"Not found"'

echo -e "\n${YELLOW}🏁 Testing complete: ${PASS} passed, ${FAIL} failed${NC}"
echo
echo -e "${YELLOW}Example curl commands:${NC}"
echo "curl -s \"${BASE_URL}/api/us?city=Burlington&state=WI\""
echo "curl -s \"${BASE_URL}/api/us?zip=53105\""
echo "curl -s \"${BASE_URL}/api/ca?city=Toronto&province=ON\""
echo "curl -s \"${BASE_URL}/api/ca?postal=M5A\""
echo "curl -s \"${BASE_URL}/api/autocomplete/us?q=santa%20bar&limit=5\""

[ "$FAIL" -eq 0 ]
