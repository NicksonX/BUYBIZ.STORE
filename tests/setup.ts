process.env.DEMO_MODE = "true";
process.env.DEMO_DB_DIR = "memory://";
process.env.DEMO_SESSION_SECRET = "vitest-demo-session-secret-at-least-32-characters";
process.env.PROXY_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.PAYSTACK_SECRET_KEY = "sk_test_buybiz_vitest_secret";
process.env.PAYSTACK_MODE = "test";
process.env.DEMO_SEED = "false";
delete process.env.ENABLE_WALLET_TRANSFERS;
