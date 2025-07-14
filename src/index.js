/**
 * Cloudflare Worker: Zip-City Lookup
 * 
 * Provides ZIP code lookup for US cities with extensible support for Canada.
 * Data is bundled as static JSON files and can be migrated to KV/R2 storage.
 * 
 * Routes:
 * - GET /api/us?city=<city>&state=<state> - US ZIP lookup
 * - GET /api/ca?city=<city>&province=<province> - Canada postal code lookup (future)
 * 
 * Custom Domain Setup:
 * 1. Add DNS CNAME: zipcity.iwpi.com -> your-worker.your-subdomain.workers.dev
 * 2. In Cloudflare Dashboard: Workers -> Custom Domains -> Add zipcity.iwpi.com
 * 3. Enable "Automatic HTTPS" for SSL certificate provisioning
 * 4. Uncomment the [[routes]] section in wrangler.toml
 */

// Import bundled JSON data
import zipcodesUS from '../data/zipcodes.us.json';
// TODO: Import Canada data when ready
// import zipcodesCA from '../data/zipcodes.ca.json';

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
    
    // TODO: Add Canada route when zipcodes.ca.json is ready
    // if (pathname.startsWith('/api/ca')) {
    //   return handleCALookup(request, env);
    // }
    
    // Default response for unmatched routes
    return new Response(
      JSON.stringify({ 
        error: 'Not found',
        available_endpoints: ['/api/us?city=<city>&state=<state>']
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
  
  // TODO: Migrate to KV storage
  // When migrating to Cloudflare KV, replace the static lookup below with:
  // const zipData = await env.ZIP_US.get(`${state}:${city}`, { type: 'json' });
  // if (!zipData) {
  //   return notFoundResponse();
  // }
  
  // TODO: Migrate to R2 storage
  // When migrating to R2, load the JSON file from R2:
  // const object = await env.ZIP_DATA.get('zipcodes.us.json');
  // const zipcodesUS = await object.json();
  
  // Perform case-insensitive lookup in bundled JSON
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
}

/**
 * Handle Canada postal code lookup (template for future implementation)
 * Expected query params: city, province
 * Example: /api/ca?city=Toronto&province=ON
 */
// async function handleCALookup(request, env) {
//   const url = new URL(request.url);
//   const city = url.searchParams.get('city');
//   const province = url.searchParams.get('province');
//   
//   if (!city || !province) {
//     return new Response(
//       JSON.stringify({ 
//         error: 'Missing required parameters', 
//         required: ['city', 'province'],
//         example: '/api/ca?city=Toronto&province=ON'
//       }), 
//       {
//         status: 400,
//         headers: {
//           'Content-Type': 'application/json',
//           ...getCORSHeaders()
//         }
//       }
//     );
//   }
//   
//   // TODO: Implement Canada lookup when zipcodes.ca.json is added
//   // const result = findPostalCode(zipcodesCA, city, province);
//   
//   return new Response(
//     JSON.stringify({ error: 'Canada lookup not yet implemented' }), 
//     {
//       status: 501,
//       headers: {
//         'Content-Type': 'application/json',
//         ...getCORSHeaders()
//       }
//     }
//   );
// }

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
