import { auth } from "../src/lib/auth";

async function main() {
    try {
        await auth.api.signUpEmail({
            body: {
                email: "user@example.com",
                password: "antigravitybot",
                name: "user",
            }
        });
        console.log("Test user created successfully! (email: user@example.com, pass: antigravitybot)");
    } catch (e) {
        console.error("Error creating user:", e);
    }
}

main();
