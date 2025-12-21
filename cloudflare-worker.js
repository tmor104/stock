/**
 * Cloudflare Worker - CORS Proxy for Google Apps Script
 *
 * This worker acts as a proxy between your frontend and Google Apps Script,
 * automatically adding CORS headers to all responses.
 *
 * SETUP:
 * 1. Go to https://dash.cloudflare.com
 * 2. Click "Workers & Pages" in the sidebar
 * 3. Click "Create Application" → "Create Worker"
 * 4. Replace the default code with this code
 * 5. Update APPS_SCRIPT_URL below with your actual Apps Script URL
 * 6. Click "Deploy"
 * 7. Use the Worker URL in your frontend instead of the Apps Script URL
 */

// ⚠️ IMPORTANT: Replace this with your actual Google Apps Script URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6yH0XWvbsDlYvhf1OaozoQhGAvlRIFPlN9oV9dr-3P5gPZpb29yl9coSOkvzEYqD04w/exec';

// CORS headers to add to every response
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Main request handler
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming requests
 */
async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  try {
    // Forward the request to Apps Script
    const response = await forwardToAppsScript(request);

    // Add CORS headers to the response
    return addCorsHeaders(response);

  } catch (error) {
    // Return error with CORS headers
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Cloudflare Worker Error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      }
    );
  }
}

/**
 * Handle CORS preflight OPTIONS requests
 */
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

/**
 * Forward the request to Google Apps Script
 */
async function forwardToAppsScript(request) {
  // Build the target URL
  let url = APPS_SCRIPT_URL;

  // For GET requests, append query parameters
  if (request.method === 'GET') {
    const requestUrl = new URL(request.url);
    const params = requestUrl.searchParams.toString();
    if (params) {
      url += (url.includes('?') ? '&' : '?') + params;
    }
  }

  // Build request options
  const options = {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  // For POST requests, include the body
  if (request.method === 'POST') {
    options.body = await request.text();
  }

  // Make the request to Apps Script
  const response = await fetch(url, options);

  return response;
}

/**
 * Add CORS headers to a response
 */
function addCorsHeaders(response) {
  // Clone the response so we can modify headers
  const newResponse = new Response(response.body, response);

  // Add CORS headers
  Object.keys(CORS_HEADERS).forEach(key => {
    newResponse.headers.set(key, CORS_HEADERS[key]);
  });

  // Ensure Content-Type is set
  if (!newResponse.headers.has('Content-Type')) {
    newResponse.headers.set('Content-Type', 'application/json');
  }

  return newResponse;
}
