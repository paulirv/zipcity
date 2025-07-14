/**
 * Cloudflare Worker: Zip-City Lookup
 * 
 * Provides ZIP code lookup for US cities with extensible support for Canada.
 * Data is stored in Cloudflare R2 bucket for scalable storage and easy updates.
 * 
 * Routes:
 * - GET /api/us?city=<city>&state=<state> - US ZIP lookup
 * - GET /api/ca?city=<city>&province=<province> - Canada postal code lookup
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
          '/api/ca?city=<city>&province=<province>'
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
