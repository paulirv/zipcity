/**
 * Cloudflare Worker: Zip-City Lookup
 * 
 * Provides ZIP code lookup for US cities with extensible support for Canada.
 * Data is stored in Cloudflare D1 database for fast SQL queries.
 * 
 * Routes:
 * - GET /api/us?city=<city>&state=<state> - US ZIP lookup
 * - GET /api/ca?city=<city>&province=<province> - Canada postal code lookup
 * - GET /api/autocomplete/us?q=<query>&limit=<limit> - US autocomplete for cities/zips
 * - GET /api/autocomplete/ca?q=<query>&limit=<limit> - Canada autocomplete for cities/postal codes
 * - GET /api/autocomplete/mx?q=<query>&limit=<limit> - Mexico autocomplete for states/postal codes
 * 
 * Custom Domain Setup:
 * 1. Add DNS CNAME: zipcity.iwpi.com -> your-worker.your-subdomain.workers.dev
 * 2. In Cloudflare Dashboard: Workers -> Custom Domains -> Add zipcity.iwpi.com
 * 3. Enable "Automatic HTTPS" for SSL certificate provisioning
 * 4. Uncomment the [[routes]] section in wrangler.toml
 */

// D1 database is now used for US and CA data instead of R2 JSON files
// Mexico data still uses R2 storage until migrated

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
    
    if (pathname.startsWith('/api/autocomplete/mx')) {
      return handleMXAutocomplete(request, env);
    }
    
    // Route handling
    if (pathname.startsWith('/api/us')) {
      return handleUSLookup(request, env);
    }
    
    // Canada route - now available with D1 database
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
          '/api/autocomplete/ca?q=<query>&limit=<limit>',
          '/api/autocomplete/mx?q=<query>&limit=<limit>'
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

  try {
    // Query D1 database for US zipcode data
    if (!env.DB) {
      throw new Error('Database binding not available');
    }

    const stmt = env.DB.prepare(`
      SELECT place, state_code, zipcode 
      FROM us_zipcodes 
      WHERE LOWER(place) = LOWER(?) AND LOWER(state_code) = LOWER(?)
      LIMIT 1
    `);
    
    const result = await stmt.bind(city, state).first();
    
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
        error: 'Failed to query zipcode data',
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
  
  try {
    // Query D1 database for Canada postal code data
    if (!env.DB) {
      throw new Error('Database binding not available');
    }

    const stmt = env.DB.prepare(`
      SELECT place, state_code, zipcode 
      FROM ca_zipcodes 
      WHERE LOWER(place) = LOWER(?) AND LOWER(state_code) = LOWER(?)
      LIMIT 1
    `);
    
    const result = await stmt.bind(city, province).first();
    
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
        error: 'Failed to query postal code data',
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
  
  // Cap limit to prevent excessive processing
  const cappedLimit = Math.min(limit, 25);
  
  try {
    // Query D1 database for US autocomplete
    if (!env.DB) {
      throw new Error('Database binding not available');
    }

    const results = await performUSAutocompleteQuery(env.DB, query, cappedLimit);
    
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
        error: 'Failed to query zipcode data',
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
  
  // Cap limit to prevent excessive processing
  const cappedLimit = Math.min(limit, 25);
  
  try {
    // Query D1 database for Canada autocomplete
    if (!env.DB) {
      throw new Error('Database binding not available');
    }

    const results = await performCAAutocompleteQuery(env.DB, query, cappedLimit);
    
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
        error: 'Failed to query postal code data',
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
 * Handle Mexico autocomplete for state names and postal codes
 * Expected query params: q, limit
 * Example: /api/autocomplete/mx?q=agu&limit=10
 * Example: /api/autocomplete/mx?q=Aguascalientes&limit=10
 * Example: /api/autocomplete/mx?q=20000&limit=10 (postal code search)
 * Supports state name search and postal code search
 */
async function handleMXAutocomplete(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const limit = parseInt(url.searchParams.get('limit')) || 10;
  
  // Validate required parameters
  if (!query || query.length < 3) {
    return new Response(
      JSON.stringify({ 
        error: 'Query parameter "q" is required and must be at least 3 characters',
        example: '/api/autocomplete/mx?q=Agu&limit=10'
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
  
  // Cap limit to prevent excessive processing
  const cappedLimit = Math.min(limit, 25);
  
  // Load Mexico postal code data from R2 storage (unchanged - still using R2)
  try {
    let zipcodesMX;
    
    // Try R2 binding first
    if (env.ZIP_DATA) {
      try {
        const object = await env.ZIP_DATA.get('zipcodes.mx.json');
        if (object) {
          zipcodesMX = await object.json();
        }
      } catch (error) {
        console.log('R2 binding failed for Mexico data:', error.message);
      }
    }
    
    // Fallback to public URL if R2 binding failed or no data found
    if (!zipcodesMX) {
      console.log('Using public URL fallback for Mexico data');
      const response = await fetch('https://pub-522895a2a41b453ab908b4e31d9e627a.r2.dev/zipcodes.mx.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch Mexico data from public URL: ${response.status}`);
      }
      zipcodesMX = await response.json();
    }
    
    // Perform autocomplete search with timeout protection
    const results = await performAutocompleteWithTimeout(zipcodesMX, query, cappedLimit, false, true);
    
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
 * Perform US autocomplete using D1 database queries
 */
async function performUSAutocompleteQuery(db, query, limit) {
  const queryLower = query.toLowerCase().trim();
  const isNumericQuery = /^\d+/.test(query);
  
  if (isNumericQuery) {
    // ZIP code search
    const stmt = db.prepare(`
      SELECT DISTINCT zipcode, place, state_code
      FROM us_zipcodes 
      WHERE zipcode LIKE ?
      ORDER BY zipcode
      LIMIT ?
    `);
    
    const results = await stmt.bind(`${query}%`, limit).all();
    
    return results.results.map(item => ({
      type: 'zipcode',
      display: `${item.zipcode} - ${item.place}, ${item.state_code}`,
      value: item.zipcode,
      city: item.place,
      state: item.state_code,
      zipcode: item.zipcode
    }));
  } else {
    // City name search - group by city/state to avoid duplicates
    const hasComma = queryLower.includes(',');
    
    if (hasComma) {
      const [cityPart, statePart] = queryLower.split(',').map(s => s.trim());
      
      const stmt = db.prepare(`
        SELECT place, state_code, MIN(zipcode) as zipcode
        FROM us_zipcodes 
        WHERE LOWER(place) LIKE LOWER(?) AND LOWER(state_code) LIKE LOWER(?)
        GROUP BY place, state_code
        ORDER BY place, state_code
        LIMIT ?
      `);
      
      const results = await stmt.bind(`${cityPart}%`, `${statePart}%`, limit).all();
      
      return results.results.map(item => ({
        type: 'city',
        display: `${item.place}, ${item.state_code}`,
        value: `${item.place}, ${item.state_code}`,
        city: item.place,
        state: item.state_code,
        zipcode: item.zipcode
      }));
    } else {
      // Simple city search - group by city/state to avoid duplicates
      const stmt = db.prepare(`
        SELECT place, state_code, MIN(zipcode) as zipcode
        FROM us_zipcodes 
        WHERE LOWER(place) LIKE LOWER(?)
        GROUP BY place, state_code
        ORDER BY place, state_code
        LIMIT ?
      `);
      
      const results = await stmt.bind(`${queryLower}%`, limit).all();
      
      return results.results.map(item => ({
        type: 'city',
        display: `${item.place}, ${item.state_code}`,
        value: `${item.place}, ${item.state_code}`,
        city: item.place,
        state: item.state_code,
        zipcode: item.zipcode
      }));
    }
  }
}

/**
 * Perform Canada autocomplete using D1 database queries
 */
async function performCAAutocompleteQuery(db, query, limit) {
  const queryLower = query.toLowerCase().trim();
  // Canadian postal codes can be alphanumeric (e.g., T1Y, H3H, etc.)
  // They typically follow pattern: Letter+Digit+Letter (first 3 chars)
  const isPostalCodeQuery = /^[A-Za-z]\d[A-Za-z]?/.test(query) || /^\d+/.test(query);
  
  if (isPostalCodeQuery) {
    // Postal code search - use UPPER for both sides since Canadian postal codes are typically uppercase
    const stmt = db.prepare(`
      SELECT DISTINCT zipcode, place, state_code
      FROM ca_zipcodes 
      WHERE UPPER(zipcode) LIKE UPPER(?)
      ORDER BY zipcode
      LIMIT ?
    `);
    
    const results = await stmt.bind(`${query}%`, limit).all();
    
    return results.results.map(item => ({
      type: 'zipcode',
      display: `${item.zipcode} - ${item.place}, ${item.state_code}`,
      value: item.zipcode,
      city: item.place,
      state: item.state_code,
      zipcode: item.zipcode
    }));
  } else {
    // City name search - group by city/state to avoid duplicates
    const hasComma = queryLower.includes(',');
    
    if (hasComma) {
      const [cityPart, provincePart] = queryLower.split(',').map(s => s.trim());
      
      const stmt = db.prepare(`
        SELECT place, state_code, MIN(zipcode) as zipcode
        FROM ca_zipcodes 
        WHERE LOWER(place) LIKE LOWER(?) AND LOWER(state_code) LIKE LOWER(?)
        GROUP BY place, state_code
        ORDER BY place, state_code
        LIMIT ?
      `);
      
      const results = await stmt.bind(`${cityPart}%`, `${provincePart}%`, limit).all();
      
      return results.results.map(item => ({
        type: 'city',
        display: `${item.place}, ${item.state_code}`,
        value: `${item.place}, ${item.state_code}`,
        city: item.place,
        state: item.state_code,
        zipcode: item.zipcode
      }));
    } else {
      // Simple city search - group by city/state to avoid duplicates
      const stmt = db.prepare(`
        SELECT place, state_code, MIN(zipcode) as zipcode
        FROM ca_zipcodes 
        WHERE LOWER(place) LIKE LOWER(?)
        GROUP BY place, state_code
        ORDER BY place, state_code
        LIMIT ?
      `);
      
      const results = await stmt.bind(`${queryLower}%`, limit).all();
      
      return results.results.map(item => ({
        type: 'city',
        display: `${item.place}, ${item.state_code}`,
        value: `${item.place}, ${item.state_code}`,
        city: item.place,
        state: item.state_code,
        zipcode: item.zipcode
      }));
    }
  }
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
 * Perform autocomplete search with timeout protection (for Mexico R2 data)
 * @param {Array} data - The zipcode/postal code data array
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results to return
 * @param {boolean} isCanada - Whether this is Canadian data
 * @param {boolean} isMexico - Whether this is Mexican data
 * @returns {Promise<Array>} Array of matching results
 */
async function performAutocompleteWithTimeout(data, query, limit, isCanada = false, isMexico = false) {
  return new Promise((resolve) => {
    // Set a timeout to prevent CPU limit exceeded
    const timeout = setTimeout(() => {
      resolve([]); // Return empty results if timeout
    }, 8000); // 8 second timeout (well under 10s CPU limit)
    
    try {
      const results = performAutocompleteOptimized(data, query, limit, isCanada, isMexico);
      clearTimeout(timeout);
      resolve(results);
    } catch (error) {
      clearTimeout(timeout);
      resolve([]); // Return empty results on error
    }
  });
}

/**
 * Optimized autocomplete search with chunked processing (for Mexico R2 data)
 * @param {Array} data - The zipcode/postal code data array
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results to return
 * @param {boolean} isCanada - Whether this is Canadian data
 * @param {boolean} isMexico - Whether this is Mexican data
 * @returns {Array} Array of matching results
 */
function performAutocompleteOptimized(data, query, limit, isCanada = false, isMexico = false) {
  const queryLower = query.toLowerCase().trim();
  const isNumericQuery = /^\d+/.test(query);
  
  // Cap the limit and chunk size to prevent excessive processing
  const maxLimit = Math.min(limit, 25);
  const chunkSize = 1000; // Process in chunks of 1000 items
  const maxItemsToProcess = 50000; // Limit total items processed
  
  let matches = [];
  const seenItems = new Set();
  let itemsProcessed = 0;
  
  // Early return for very short queries
  if (queryLower.length < 2) {
    return [];
  }
  
  // Process data in chunks to prevent CPU timeout
  for (let chunkStart = 0; chunkStart < data.length && chunkStart < maxItemsToProcess; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, data.length, maxItemsToProcess);
    const chunk = data.slice(chunkStart, chunkEnd);
    
    for (let i = 0; i < chunk.length && matches.length < maxLimit; i++) {
      const item = chunk[i];
      itemsProcessed++;
      
      // Early termination if we've found enough matches
      if (matches.length >= maxLimit) {
        break;
      }
      
      if (isNumericQuery) {
        // ZIP/Postal code search
        const code = item.zipcode || '';
        if (code.toLowerCase().startsWith(queryLower)) {
          const displayValue = isMexico 
            ? `${item.zipcode} - ${item.place}, ${item.state}`
            : isCanada 
              ? `${item.zipcode} - ${item.place}, ${item.state_code}`
              : `${item.zipcode} - ${item.place}, ${item.state_code}`;
              
          if (!seenItems.has(item.zipcode)) {
            seenItems.add(item.zipcode);
            matches.push({
              type: 'zipcode',
              display: displayValue,
              value: item.zipcode,
              city: item.place,
              state: isMexico ? item.state : item.state_code,
              zipcode: item.zipcode
            });
          }
        }
      } else if (isMexico) {
        // Mexico state search
        const stateName = item.state || '';
        const stateKey = stateName.toLowerCase();
        
        if (stateName.toLowerCase().includes(queryLower) && !seenItems.has(stateKey)) {
          seenItems.add(stateKey);
          matches.push({
            type: 'state',
            display: item.state,
            value: item.state,
            state: item.state,
            state_code: item.state_code
          });
        }
      } else {
        // City name search with optimized matching
        const hasComma = queryLower.includes(',');
        
        if (hasComma) {
          const [cityPart, statePart] = queryLower.split(',').map(s => s.trim());
          
          if (cityPart && statePart) {
            const cityName = item.place || '';
            const stateCode = item.state_code || '';
            const cityKey = `${cityName.toLowerCase()},${stateCode.toLowerCase()}`;
            
            const cityMatches = cityName.toLowerCase().includes(cityPart);
            const stateMatches = stateCode.toLowerCase().startsWith(statePart);
            
            if (cityMatches && stateMatches && !seenItems.has(cityKey)) {
              seenItems.add(cityKey);
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
        } else {
          // Simple city search with starts-with for better performance
          const cityName = item.place || '';
          const stateCode = item.state_code || '';
          const cityKey = `${cityName.toLowerCase()},${stateCode.toLowerCase()}`;
          
          if (cityName.toLowerCase().startsWith(queryLower) && !seenItems.has(cityKey)) {
            seenItems.add(cityKey);
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
    
    // Break if we have enough results or processed too many items
    if (matches.length >= maxLimit || itemsProcessed >= maxItemsToProcess) {
      break;
    }
  }
  
  // Sort results by relevance (exact matches first, then alphabetical)
  matches.sort((a, b) => {
    const aExact = a.display.toLowerCase().startsWith(queryLower);
    const bExact = b.display.toLowerCase().startsWith(queryLower);
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    return a.display.localeCompare(b.display);
  });
  
  return matches;
}
