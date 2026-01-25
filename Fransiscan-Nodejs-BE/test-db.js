require('dotenv').config()
const { executeQuery, connectDatabase } = require('./src/config/database')

async function testQuery() {
  try {
    console.log('Testing database connection...')
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET')
    console.log('DB_USER:', process.env.DB_USER)
    
    // Connect to database first
    await connectDatabase()
    console.log('✅ Database connected')
    
    // Test simple query
    const result = await executeQuery('SELECT TOP 1 Code FROM NicheApplication WHERE Code = @code', { code: '3795-1' })
    
    if (result.recordset.length > 0) {
      console.log('✅ Found application:', result.recordset[0].Code)
    } else {
      console.log('❌ No application found for 3795-1')
    }
    
    // Test full query
    const fullResult = await executeQuery('SELECT TOP 1 * FROM NicheApplication WHERE Code = @code', { code: '3795-1' })
    
    if (fullResult.recordset.length > 0) {
      const app = fullResult.recordset[0]
      console.log('✅ Full application data:')
      console.log('  Code:', app.Code)
      console.log('  ApplicantName:', app.ApplicantName)
      console.log('  NomineeName:', app.NomineeName)
      console.log('  NomineeName2:', app.NomineeName2)
      console.log('  NicheId:', app.NicheId)
    } else {
      console.log('❌ No full application data found')
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message)
  }
  
  process.exit(0)
}

testQuery()
