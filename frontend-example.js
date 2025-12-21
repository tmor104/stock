/**
 * Example: How to use the Cloudflare Worker in your frontend
 *
 * Worker URL: https://stock-cors-proxy.tomwmorgan47.workers.dev
 */

// ============================================
// Configuration
// ============================================

const API_URL = 'https://stock-cors-proxy.tomwmorgan47.workers.dev';

// ============================================
// Example API Calls
// ============================================

/**
 * Example 1: Simple GET request
 */
async function testWorker() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    console.log('✅ Worker Response:', data);
    return data;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

/**
 * Example 2: POST request to authenticate
 */
async function authenticateUser(username, password) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'authenticate',
        username: username,
        password: password
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Authenticated:', data.username);
      return data;
    } else {
      console.error('❌ Authentication failed:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

/**
 * Example 3: Get product database
 */
async function getProductDatabase() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getProductDatabase'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Products loaded:', data.products.length);
      return data.products;
    } else {
      console.error('❌ Failed to load products:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

/**
 * Example 4: Sync scans to Google Sheets
 */
async function syncScans(stocktakeId, scans) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'syncScans',
        stocktakeId: stocktakeId,
        scans: scans
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Synced ${data.syncedCount} scans`);
      return data;
    } else {
      console.error('❌ Sync failed:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

/**
 * Example 5: Get locations
 */
async function getLocations() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getLocations'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Locations loaded:', data.locations);
      return data.locations;
    } else {
      console.error('❌ Failed to load locations:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// ============================================
// React Integration Example
// ============================================

/**
 * Example: Using the API in a React component
 */
function ExampleReactComponent() {
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // Load products when component mounts
  React.useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const productData = await getProductDatabase();
        setProducts(productData);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Products ({products.length})</h2>
      <ul>
        {products.map(product => (
          <li key={product.barcode}>
            {product.product} - {product.barcode}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// Quick Test
// ============================================

// Run this in your browser console to test the worker:
console.log('🚀 Testing Cloudflare Worker...');
testWorker()
  .then(() => console.log('✅ Worker is functioning correctly!'))
  .catch(() => console.error('❌ Worker test failed'));
