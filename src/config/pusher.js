const Pusher = require("pusher");
const {
  PUSHER_APP_ID,
  PUSHER_KEY,
  PUSHER_SECRET,
  PUSHER_CLUSTER,
} = require("./env");

if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
  throw new Error("Missing Pusher configuration in environment variables");
}

const pusher = new Pusher({
  appId: PUSHER_APP_ID,
  key: PUSHER_KEY,
  secret: PUSHER_SECRET,
  cluster: PUSHER_CLUSTER,
  useTLS: true,
});

module.exports = pusher;