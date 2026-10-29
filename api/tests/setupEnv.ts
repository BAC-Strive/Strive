// Jest kører uden .env, så testene får her en fast værdi for JWT_SECRET, så de kan køre uden fejl.
process.env.JWT_SECRET = "test-secret";