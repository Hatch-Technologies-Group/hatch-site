#!/usr/bin/env node

/**
 * Test script for Cognito agent invite flow
 *
 * This script:
 * 1. Logs in as broker@hatchcrm.test
 * 2. Creates an agent invite for a test email
 * 3. Displays the generated Cognito signup URL
 * 4. Shows the invite details
 */

const API_URL = 'http://localhost:4000/api/v1';

async function testInviteFlow() {
  console.log('🧪 Testing Cognito Agent Invite Flow\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as broker
    console.log('\n📝 Step 1: Logging in as broker@hatchcrm.test...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'broker@hatchcrm.test',
        password: 'password123'  // Default seed password
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('❌ Login failed:', error);
      console.log('\n💡 Note: If broker user has no password, you may need to:');
      console.log('   1. Update seed.ts to add passwordHash for broker user');
      console.log('   2. Or use a different auth method to get a token');
      return;
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.accessToken;
    console.log('✅ Login successful!');
    console.log(`   User: ${loginData.user.email}`);
    console.log(`   Role: ${loginData.user.role}`);
    console.log(`   Token: ${accessToken.substring(0, 30)}...`);

    // Step 2: Create agent invite
    console.log('\n📧 Step 2: Creating agent invite...');
    const testEmail = `test-agent-${Date.now()}@example.com`;

    const inviteResponse = await fetch(`${API_URL}/organizations/org-hatch/invites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        email: testEmail
      })
    });

    if (!inviteResponse.ok) {
      const error = await inviteResponse.text();
      console.error('❌ Invite creation failed:', error);
      return;
    }

    const inviteData = await inviteResponse.json();
    console.log('✅ Invite created successfully!');
    console.log(`   Invite ID: ${inviteData.id}`);
    console.log(`   Email: ${inviteData.email}`);
    console.log(`   Token: ${inviteData.token}`);
    console.log(`   Status: ${inviteData.status}`);
    console.log(`   Expires: ${inviteData.expiresAt}`);

    // Step 3: Generate Cognito signup URL
    console.log('\n🔗 Step 3: Generating Cognito signup URL...');

    const cognitoDomain = process.env.COGNITO_DOMAIN || 'https://us-east-28xfagdiwk.auth.us-east-2.amazoncognito.com';
    const clientId = process.env.COGNITO_CLIENT_ID || '1nv2o77gk4h0tmf317oouo317k';
    const callbackUrl =
      process.env.COGNITO_CALLBACK_URL ||
      (() => {
        const base = process.env.COGNITO_REDIRECT_URI || 'http://localhost:3000';
        const normalized = base.replace(/\/+$/, '');
        if (normalized.endsWith('/api/v1/auth/cognito/callback')) return normalized;
        if (normalized.endsWith('/api/v1')) return `${normalized}/auth/cognito/callback`;
        return `${normalized}/api/v1/auth/cognito/callback`;
      })();

    const state = Buffer.from(JSON.stringify({ inviteToken: inviteData.token })).toString('base64url');
    const signupUrl = `${cognitoDomain}/signup?client_id=${clientId}&response_type=code&scope=openid+email&redirect_uri=${encodeURIComponent(
      callbackUrl
    )}&state=${encodeURIComponent(state)}&login_hint=${encodeURIComponent(testEmail)}`;

    console.log('✅ Cognito Signup URL generated!');
    console.log(`\n📋 Signup URL:\n${signupUrl}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!\n');

    console.log('📝 Next steps to test the full flow:');
    console.log('   1. Check server logs for email send attempt');
    console.log('   2. Open the signup URL in a browser');
    console.log('   3. Complete Cognito signup');
    console.log('   4. Verify callback creates user with org association');
    console.log('   5. Check that invite status is updated to ACCEPTED\n');

    // Step 4: Verify email was sent (check logs)
    console.log('💌 Email status:');
    console.log('   Check API logs above for "Invite email sent" message');
    console.log('   Or "Demo mode: skipping email" if in demo mode\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Run the test
testInviteFlow();
