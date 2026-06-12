const Pusher = require("pusher");
const {
  PUSHER_APP_ID,
  PUSHER_KEY,
  PUSHER_SECRET,
  PUSHER_CLUSTER,
  NODE_ENV,
} = require("./env");

let pusher;

if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
  if (NODE_ENV === "production") {
    throw new Error("Missing Pusher configuration in environment variables");
  } else {
    console.warn("⚠️ Warning: Pusher configuration is missing. Real-time notifications and chat features will not work locally.");
    pusher = {
      trigger: async () => {
        console.warn("⚠️ Mock Pusher: trigger called but Pusher is not configured.");
        return null;
      },
      authorizeChannel: () => {
        console.warn("⚠️ Mock Pusher: authorizeChannel called but Pusher is not configured.");
        return { auth: "mock-auth" };
      }
    };
  }
} else {
  pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
}

module.exports = pusher;