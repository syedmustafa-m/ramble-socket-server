const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: ["http://192.168.18.43:3000", "https://ramble-app.vercel.app"],
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
});

const usersQueue = [];

function tryMatch(socket) {
  const available = usersQueue.filter((s) => s !== socket && s.partner == null);
  const match = available.shift();

  if (match) {
    // Remove match from queue
    const index = usersQueue.indexOf(match);
    if (index !== -1) usersQueue.splice(index, 1);

    socket.partner = match;
    match.partner = socket;

    socket.emit("partnerFound");
    match.emit("partnerFound");
  } else {
    // No match found, add to queue
    if (!usersQueue.includes(socket)) usersQueue.push(socket);
  }
}

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);
  tryMatch(socket);

  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  socket.on("skip", () => {
    console.log("↪️ Skip requested:", socket.id);

    const oldPartner = socket.partner;
    if (oldPartner) {
      oldPartner.partner = null;
      oldPartner.emit("partnerLeft");
    }

    socket.partner = null;

    tryMatch(socket);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    const index = usersQueue.indexOf(socket);
    if (index !== -1) usersQueue.splice(index, 1);

    if (socket.partner) {
      socket.partner.emit("partnerLeft");
      socket.partner.partner = null;
      tryMatch(socket.partner);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🔌 Socket.IO server running on port ${PORT}`);
});
