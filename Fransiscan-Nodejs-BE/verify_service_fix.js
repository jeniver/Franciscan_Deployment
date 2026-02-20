const PersonService = require('./src/services/PersonService');
const { executeQuery } = require('./src/config/database');

async function run() {
    // Mock repository since PersonService needs it
    const repo = {
        getById: async (id) => {
            const result = await executeQuery('SELECT * FROM Person WHERE PersonId = @id', { id });
            return result.recordset[0];
        }
    };

    const service = new PersonService(repo);
    try {
        const profile = await service.getPersonProfile(6857);
        console.log(JSON.stringify(profile, null, 2));
    } catch (err) {
        console.error('Service failed:', err);
    }
    process.exit();
}

run();
