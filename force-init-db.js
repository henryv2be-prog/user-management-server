const { initDatabase } = require('./database/init');

console.log('Force initializing database...');

initDatabase()
    .then(() => {
        console.log('Database initialization completed successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Database initialization failed:', err);
        process.exit(1);
    });
