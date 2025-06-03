

const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: ["https://ramble-khaki.vercel.app/"], // ✅ your frontend domain
    methods: ["GET", "POST"]
  },
  path: "/socket.io",
});


const usersQueue = [];

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);
  usersQueue.push(socket);

  if (usersQueue.length >= 2) {
    const [user1, user2] = usersQueue.splice(0, 2);
    user1.partner = user2;
    user2.partner = user1;

    user1.emit("partnerFound");
    user2.emit("partnerFound");

    user1.on("message", (msg) => user2.emit("message", msg));
    user2.on("message", (msg) => user1.emit("message", msg));
  }

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    const i = usersQueue.indexOf(socket);
    if (i !== -1) usersQueue.splice(i, 1);
    if (socket.partner) {
      socket.partner.emit("partnerLeft");
      socket.partner.partner = null;
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log("🔌 Socket.IO server running on port 3001");
});

