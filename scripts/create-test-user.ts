import { auth } from "../src/lib/auth";
import { env } from "../src/lib/env";

function assertSafeEnvironment() {
    if (process.env.ALLOW_CREATE_TEST_USER !== "1") {
        throw new Error("Refusing to create a test user without ALLOW_CREATE_TEST_USER=1");
    }

    if (env.NODE_ENV === "production") {
        throw new Error("Refusing to create a test user in production");
    }

    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(env.BETTER_AUTH_URL)) {
        throw new Error(`Refusing to create a test user against non-local BETTER_AUTH_URL: ${env.BETTER_AUTH_URL}`);
    }
}

async function main() {
    try {
        assertSafeEnvironment();

        const email = process.env.TEST_USER_EMAIL;
        const password = process.env.TEST_USER_PASSWORD;
        const name = process.env.TEST_USER_NAME ?? "Test User";

        if (!email || !password) {
            throw new Error("TEST_USER_EMAIL and TEST_USER_PASSWORD are required");
        }

        await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            }
        });
        console.log(`Test user created successfully! (email: ${email})`);
    } catch (e) {
        console.error("Error creating user:", e);
        process.exitCode = 1;
    }
}

main();
