const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123',
  firstName: 'Test',
  lastName: 'User'
};

const testVisitor = {
  userId: 1, // Assuming admin user has ID 1
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
};

async function testVisitorAPI() {
  try {
    console.log('🧪 Testing Visitor API...\n');

    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful\n');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Create a visitor
    console.log('2. Creating a visitor...');
    const createResponse = await fetch(`${BASE_URL}/visitors`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testVisitor)
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Create visitor failed: ${JSON.stringify(errorData)}`);
    }

    const createData = await createResponse.json();
    const visitorId = createData.visitor.id;
    console.log('✅ Visitor created:', createData.visitor.firstName, createData.visitor.lastName);

    // 3. Get visitor by ID
    console.log('\n3. Getting visitor by ID...');
    const getResponse = await fetch(`${BASE_URL}/visitors/${visitorId}`, {
      method: 'GET',
      headers
    });

    if (!getResponse.ok) {
      throw new Error(`Get visitor failed: ${getResponse.statusText}`);
    }

    const getData = await getResponse.json();
    console.log('✅ Visitor retrieved:', getData.visitor.firstName, getData.visitor.lastName);

    // 4. Get all visitors (admin)
    console.log('\n4. Getting all visitors...');
    const allResponse = await fetch(`${BASE_URL}/visitors/all`, {
      method: 'GET',
      headers
    });

    if (!allResponse.ok) {
      throw new Error(`Get all visitors failed: ${allResponse.statusText}`);
    }

    const allData = await allResponse.json();
    console.log(`✅ Retrieved ${allData.visitors.length} visitors`);

    // 5. Get visitors for specific user
    console.log('\n5. Getting visitors for user...');
    const userVisitorsResponse = await fetch(`${BASE_URL}/visitors/user/1`, {
      method: 'GET',
      headers
    });

    if (!userVisitorsResponse.ok) {
      throw new Error(`Get user visitors failed: ${userVisitorsResponse.statusText}`);
    }

    const userVisitorsData = await userVisitorsResponse.json();
    console.log(`✅ Retrieved ${userVisitorsData.visitors.length} visitors for user`);

    // 6. Update visitor
    console.log('\n6. Updating visitor...');
    const updateResponse = await fetch(`${BASE_URL}/visitors/${visitorId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        firstName: 'Jane',
        phone: '+0987654321'
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Update visitor failed: ${updateResponse.statusText}`);
    }

    const updateData = await updateResponse.json();
    console.log('✅ Visitor updated:', updateData.visitor.firstName);

    // 7. Get visitor statistics
    console.log('\n7. Getting visitor statistics...');
    const statsResponse = await fetch(`${BASE_URL}/visitors/stats/overview`, {
      method: 'GET',
      headers
    });

    if (!statsResponse.ok) {
      throw new Error(`Get stats failed: ${statsResponse.statusText}`);
    }

    const statsData = await statsResponse.json();
    console.log('✅ Visitor statistics:', statsData.stats);

    // 8. Delete visitor
    console.log('\n8. Deleting visitor...');
    const deleteResponse = await fetch(`${BASE_URL}/visitors/${visitorId}`, {
      method: 'DELETE',
      headers
    });

    if (!deleteResponse.ok) {
      throw new Error(`Delete visitor failed: ${deleteResponse.statusText}`);
    }

    console.log('✅ Visitor deleted successfully');

    console.log('\n🎉 All visitor API tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testVisitorAPI();