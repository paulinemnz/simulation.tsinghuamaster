#!/usr/bin/env node
/**
 * Generate secure random secrets for JWT and Admin authentication
 * Run with: node generate-secrets.js
 */

const crypto = require('crypto');

console.log('\n🔐 Generating Secure Secrets for Production\n');
console.log('=' .repeat(60));

// Generate JWT Secret (32 bytes = 64 hex characters)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('\n✅ JWT_SECRET:');
console.log(jwtSecret);

// Generate Admin Secret (32 bytes = 64 hex characters)
const adminSecret = crypto.randomBytes(32).toString('hex');
console.log('\n✅ ADMIN_SECRET:');
console.log(adminSecret);

console.log('\n' + '='.repeat(60));
console.log('\n📝 Add these to your .env file:\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ADMIN_SECRET=${adminSecret}`);
console.log('\n⚠️  Keep these secrets secure! Never commit them to version control.\n');
