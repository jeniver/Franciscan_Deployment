/**
 * Script to create a test user in the database
 * This will help debug the authentication issues
 */

const { connectDatabase, executeQuery } = require('./Fransiscan-Nodejs-BE/src/config/database');

async function createTestUser() {
  console.log('🔧 Creating test user...\n');
  
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');
    
    // Check if user table exists and has data
    try {
      const userCheck = await executeQuery('SELECT COUNT(*) as count FROM [User]');
      console.log(`📊 User table has ${userCheck.recordset[0].count} records`);
    } catch (error) {
      console.log('⚠️  User table check failed:', error.message);
    }
    
    // Try to create a test user with proper SQL
    const createUserQuery = `
      IF NOT EXISTS (SELECT 1 FROM [User] WHERE UserName = 'testuser')
      BEGIN
        INSERT INTO [User] (UserName, Password, Email, RoleId, ChurchId, IsActive, CreatedDate)
        VALUES ('testuser', 'testpass123', 'test@example.com', 2, 1, 1, GETDATE())
        SELECT 'User created' as message, SCOPE_IDENTITY() as userId
      END
      ELSE
      BEGIN
        SELECT 'User already exists' as message, UserId as userId 
        FROM [User] WHERE UserName = 'testuser'
      END
    `;
    
    console.log('📝 Executing user creation query...');
    const result = await executeQuery(createUserQuery);
    console.log('✅ Query executed successfully');
    console.log('Response:', result.recordset);
    
    // Verify the user was created
    const verifyQuery = `
      SELECT UserId, UserName, Email, RoleId, ChurchId, IsActive 
      FROM [User] 
      WHERE UserName = 'testuser'
    `;
    
    const verifyResult = await executeQuery(verifyQuery);
    console.log('\n🔍 Verification result:');
    if (verifyResult.recordset.length > 0) {
      const user = verifyResult.recordset[0];
      console.log(`✅ Test user created successfully!`);
      console.log(`   User ID: ${user.UserId}`);
      console.log(`   Username: ${user.UserName}`);
      console.log(`   Email: ${user.Email}`);
      console.log(`   Role ID: ${user.RoleId}`);
      console.log(`   Church ID: ${user.ChurchId}`);
      console.log(`   Active: ${user.IsActive}`);
      
      console.log('\n💡 You can now test authentication with:');
      console.log('   Username: testuser');
      console.log('   Password: testpass123');
    } else {
      console.log('❌ User verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the script
createTestUser();