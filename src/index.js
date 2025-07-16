/**
 * Cloudflare Worker: Zip-City Lookup
 * 
 * Provides ZIP code lookup for US cities with extensible support for Canada.
 * Data is stored in Cloudflare R2 bucket for scalable storage and easy updates.
 * 
 * Routes:
 * - GET /api/us?city=<city>&state=<state> - US ZIP lookup
 * - GET /api/ca?city=<city>&province=<province> - Canada postal code lookup
 * - GET /api/autocomplete/us?q=<query>&limit=<limit> - US autocomplete for cities/zips
 * - GET /api/autocomplete/ca?q=<query>&limit=<limit> - Canada autocomplete for cities/postal codes
 * 
 * Custom Domain Setup:
 * 1. Add DNS CNAME: zipcity.iwpi.com -> your-worker.your-subdomain.workers.dev
 * 2. In Cloudflare Dashboard: Workers -> Custom Domains -> Add zipcity.iwpi.com
 * 3. Enable "Automatic HTTPS" for SSL certificate provisioning
 * 4. Uncomment the [[routes]] section in wrangler.toml
 */

// R2 storage is now used instead of bundled JSON files
// Data is loaded dynamically from the ZIP_DATA R2 bucket

/**
 * Main Worker request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }
    
    // Autocomplete routes
    if (pathname.startsWith('/api/autocomplete/us')) {
      return handleUSAutocomplete(request, env);
    }
    
    if (pathname.startsWith('/api/autocomplete/ca')) {
      return handleCAAutocomplete(request, env);
    }
    
    // Route handling
    if (pathname.startsWith('/api/us')) {
      return handleUSLookup(request, env);
    }
    
    // Canada route - now available with R2 storage
    if (pathname.startsWith('/api/ca')) {
      return handleCALookup(request, env);
    }
    
    // Default response for unmatched routes
    return new Response(
      JSON.stringify({ 
        error: 'Not found',
        available_endpoints: [
          '/api/us?city=<city>&state=<state>',
          '/api/ca?city=<city>&province=<province>',
          '/api/autocomplete/us?q=<query>&limit=<limit>',
          '/api/autocomplete/ca?q=<query>&limit=<limit>'
        ]
      }), 
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
};

/**
 * Handle US ZIP code lookup
 * Expected query params: city, state
 * Example: /api/us?city=Burlington&state=WI
 */
async function handleUSLookup(request, env) {
  const url = new URL(request.url);
  const city = url.searchParams.get('city');
  const state = url.searchParams.get('state');
  
  // Validate required parameters
  if (!city || !state) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required parameters', 
        required: ['city', 'state'],
        example: '/api/us?city=Burlington&state=WI'
      }), 
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
   // Load US zipcode data from R2 storage
  try {
    let zipcodesUS;
    
    // Try R2 binding first
    if (env.ZIP_DATA) {
      try {
        const object = await env.ZIP_DATA.get('zipcodes.us.json');
        if (object) {
          zipcodesUS = await object.json();
        }
      } catch (error) {
        console.log('R2 binding failed:', error.message);
      }
    }
    
    // Fallback to public URL if R2 binding failed or no data found
    if (!zipcodesUS) {
      console.log('Using public URL fallback for US data');
      const response = await fetch('https://pub-522895a2a41b453ab908b4e31d9e627a.r2.dev/zipcodes.us.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch from public URL: ${response.status}`);
      }
      zipcodesUS = await response.json();
    }
    
    // Perform case-insensitive lookup in R2 data
    const result = findZipcode(zipcodesUS, city, state);
    
    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Not found' }), 
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders()
          }
        }
      );
    }
    
    // Return successful result
    return new Response(
      JSON.stringify({
        city: result.place,
        state: result.state_code,
        zip: result.zipcode
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to load zipcode data',
        details: error.message 
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
}

/**
 * Handle Canada postal code lookup
 * Expected query params: city, province
 * Example: /api/ca?city=Toronto&province=ON
 */
async function handleCALookup(request, env) {
  const url = new URL(request.url);
  const city = url.searchParams.get('city');
  const province = url.searchParams.get('province');
  
  // Validate required parameters
  if (!city || !province) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required parameters', 
        required: ['city', 'province'],
        example: '/api/ca?city=Toronto&province=ON'
      }), 
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
  
  // Load Canada postal code data from R2 storage
  try {
    let zipcodesCA;
    
    // Try R2 binding first
    if (env.ZIP_DATA) {
      try {
        const object = await env.ZIP_DATA.get('zipcodes.ca.json');
        if (object) {
          zipcodesCA = await object.json();
        }
      } catch (error) {
        console.log('R2 binding failed for Canada data:', error.message);
      }
    }
    
    // Fallback to public URL if R2 binding failed or no data found
    if (!zipcodesCA) {
      console.log('Using public URL fallback for Canada data');
      const response = await fetch('https://pub-522895a2a41b453ab908b4e31d9e627a.r2.dev/zipcodes.ca.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch Canada data from public URL: ${response.status}`);
      }
      zipcodesCA = await response.json();
    }
    
    // Perform case-insensitive lookup in R2 data
    const result = findPostalCode(zipcodesCA, city, province);
    
    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Not found' }), 
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders()
          }
        }
      );
    }
    
    // Return successful result
    return new Response(
      JSON.stringify({
        city: result.place,
        province: result.state_code,
        postal_code: result.zipcode
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to load postal code data',
        details: error.message 
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
}

/**
 * Handle US autocomplete for city names and ZIP codes
 * Expected query params: q, limit
 * Example: /api/autocomplete/us?q=bur&limit=10
 * Example: /api/autocomplete/us?q=Burlington, WI&limit=10
 * Example: /api/autocomplete/us?q=Burlington WI&limit=10
 * Example: /api/autocomplete/us?q=Burlington W&limit=10 (partial state)
 * Supports city name search, city+state search (full/partial), and ZIP code search
 */
async function handleUSAutocomplete(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const limit = parseInt(url.searchParams.get('limit')) || 10;
  
  // Validate required parameters
  if (!query || query.length < 3) {
    return new Response(
      JSON.stringify({ 
        error: 'Query parameter "q" is required and must be at least 3 characters',
        example: '/api/autocomplete/us?q=Burli&limit=10'
      }), 
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
  
  // Load US zipcode data from R2 storage
  try {
    let zipcodesUS;
    
    // Try R2 binding first
    if (env.ZIP_DATA) {
      try {
        const object = await env.ZIP_DATA.get('zipcodes.us.json');
        if (object) {
          zipcodesUS = await object.json();
        }
      } catch (error) {
        console.log('R2 binding failed:', error.message);
      }
    }
    
    // Fallback to public URL if R2 binding failed or no data found
    if (!zipcodesUS) {
      console.log('Using public URL fallback for US data');
      const response = await fetch('https://pub-522895a2a41b453ab908b4e31d9e627a.r2.dev/zipcodes.us.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch from public URL: ${response.status}`);
      }
      zipcodesUS = await response.json();
    }
    
    // Perform autocomplete search
    const results = performAutocomplete(zipcodesUS, query, limit);
    
    // Return successful result
    return new Response(
      JSON.stringify({
        query: query,
        results: results,
        count: results.length
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to load zipcode data',
        details: error.message 
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
}

/**
 * Handle Canada autocomplete for city names and postal codes
 * Expected query params: q, limit
 * Example: /api/autocomplete/ca?q=tor&limit=10
 * Example: /api/autocomplete/ca?q=Toronto, ON&limit=10
 * Example: /api/autocomplete/ca?q=Toronto ON&limit=10
 * Example: /api/autocomplete/ca?q=Toronto O&limit=10 (partial province)
 * Supports city name search, city+province search (full/partial), and postal code search
 */
async function handleCAAutocomplete(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const limit = parseInt(url.searchParams.get('limit')) || 10;
  
  // Validate required parameters
  if (!query || query.length < 3) {
    return new Response(
      JSON.stringify({ 
        error: 'Query parameter "q" is required and must be at least 3 characters',
        example: '/api/autocomplete/ca?q=Toro&limit=10'
      }), 
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
  
  // Load Canada postal code data from R2 storage
  try {
    let zipcodesCA;
    
    // Try R2 binding first
    if (env.ZIP_DATA) {
      try {
        const object = await env.ZIP_DATA.get('zipcodes.ca.json');
        if (object) {
          zipcodesCA = await object.json();
        }
      } catch (error) {
        console.log('R2 binding failed for Canada data:', error.message);
      }
    }
    
    // Fallback to public URL if R2 binding failed or no data found
    if (!zipcodesCA) {
      console.log('Using public URL fallback for Canada data');
      const response = await fetch('https://pub-522895a2a41b453ab908b4e31d9e627a.r2.dev/zipcodes.ca.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch Canada data from public URL: ${response.status}`);
      }
      zipcodesCA = await response.json();
    }
    
    // Perform autocomplete search
    const results = performAutocomplete(zipcodesCA, query, limit, true);
    
    // Return successful result
    return new Response(
      JSON.stringify({
        query: query,
        results: results,
        count: results.length
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to load postal code data',
        details: error.message 
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
}

/**
 * Find zipcode in data array with case-insensitive matching
 */
function findZipcode(data, city, state) {
  const cityLower = city.toLowerCase();
  const stateLower = state.toLowerCase();
  
  return data.find(item => 
    item.place && item.state_code &&
    item.place.toLowerCase() === cityLower && 
    item.state_code.toLowerCase() === stateLower
  );
}

/**
 * Find postal code in Canada data array with case-insensitive matching
 */
function findPostalCode(data, city, province) {
  const cityLower = city.toLowerCase();
  const provinceLower = province.toLowerCase();
  
  return data.find(item => 
    item.place && item.state_code &&
    item.place.toLowerCase() === cityLower && 
    item.state_code.toLowerCase() === provinceLower
  );
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders()
  });
}

/**
 * Get CORS headers for cross-origin requests
 */
function getCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * Perform autocomplete search on the data
 * Supports city name search, city+state search, and ZIP/postal code search
 * @param {Array} data - The zipcode/postal code data array
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results to return
 * @param {boolean} isCanada - Whether this is Canadian data (affects field names)
 * @returns {Array} Array of matching results
 */
function performAutocomplete(data, query, limit, isCanada = false) {
  const queryLower = query.toLowerCase().trim();
  const isNumericQuery = /^\d+/.test(query); // Check if query starts with numbers
  
  // Cap the limit to prevent excessive processing
  const maxLimit = Math.min(limit, 50);
  
  let matches = [];
  const seenCities = new Set(); // To avoid duplicate city names
  
  if (isNumericQuery) {
    // ZIP/Postal code search - query starts with numbers
    for (let i = 0; i < data.length && matches.length < maxLimit; i++) {
      const item = data[i];
      const code = item.zipcode || '';
      
      if (code.toLowerCase().startsWith(queryLower)) {
        matches.push({
          type: 'zipcode',
          display: isCanada 
            ? `${item.zipcode} - ${item.place}, ${item.state_code}`
            : `${item.zipcode} - ${item.place}, ${item.state_code}`,
          value: item.zipcode,
          city: item.place,
          state: item.state_code,
          zipcode: item.zipcode
        });
      }
    }
  } else {
    // City name search - query is letters
    // Check for comma separation first
    const hasComma = queryLower.includes(',');
    
    if (hasComma) {
      // User entered city + state combination with comma (e.g., "coos, o", "coos b, or")
      const [cityPart, statePart] = queryLower.split(',').map(s => s.trim());
      
      if (cityPart && statePart) {
        for (let i = 0; i < data.length && matches.length < maxLimit; i++) {
          const item = data[i];
          const cityName = item.place || '';
          const stateCode = item.state_code || '';
          const cityKey = `${cityName.toLowerCase()},${stateCode.toLowerCase()}`;
          
          // Check if city matches with word boundaries for multi-word cities
          const cityMatches = matchesWithWordBoundary(cityName.toLowerCase(), cityPart);
          // Check if state matches (exact for full codes, prefix for partial)
          const stateMatches = stateCode.toLowerCase().startsWith(statePart);
          
          if (cityMatches && stateMatches && !seenCities.has(cityKey)) {
            seenCities.add(cityKey);
            matches.push({
              type: 'city',
              display: `${item.place}, ${item.state_code}`,
              value: `${item.place}, ${item.state_code}`,
              city: item.place,
              state: item.state_code,
              zipcode: item.zipcode
            });
          }
        }
      }
    } else {
      // No comma - city only search with word boundary matching
      for (let i = 0; i < data.length && matches.length < maxLimit; i++) {
        const item = data[i];
        const cityName = item.place || '';
        const stateCode = item.state_code || '';
        const cityKey = `${cityName.toLowerCase()},${stateCode.toLowerCase()}`;
        
        // Check if city name matches with word boundaries for multi-word cities
        const cityMatches = matchesWithWordBoundary(cityName.toLowerCase(), queryLower);
        
        if (cityMatches && !seenCities.has(cityKey)) {
          seenCities.add(cityKey);
          matches.push({
            type: 'city',
            display: `${item.place}, ${item.state_code}`,
            value: `${item.place}, ${item.state_code}`,
            city: item.place,
            state: item.state_code,
            zipcode: item.zipcode
          });
        }
      }
    }
  }
  
  // Sort results alphabetically by display value
  matches.sort((a, b) => a.display.localeCompare(b.display));
  
  return matches;
}

/**
 * Check if a full name matches a query with word boundary matching
 * Supports multi-word matching where each word in query must match word boundaries in the full name
 * @param {string} fullName - The full name to check (e.g., "coos bay")
 * @param {string} query - The query to match (e.g., "coos b")
 * @returns {boolean} True if query matches with word boundaries
 */
function matchesWithWordBoundary(fullName, query) {
  const queryWords = query.split(/\s+/);
  const nameWords = fullName.split(/\s+/);
  
  // Each query word must match a corresponding name word from the beginning
  for (let i = 0; i < queryWords.length; i++) {
    if (i >= nameWords.length) {
      return false; // More query words than name words
    }
    
    // Each query word must be a prefix of the corresponding name word
    if (!nameWords[i].startsWith(queryWords[i])) {
      return false;
    }
  }
  
  return true;
}
