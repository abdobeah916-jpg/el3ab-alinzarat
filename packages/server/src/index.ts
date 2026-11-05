import { createServer } from "node:http";
import { createApp } from "./http";
import { MemoryRoomStore } from "./rooms/memoryStore";
import { MemoryQuestionRepository } from "./questions/memoryRepository";
import { RoomService } from "./rooms/roomService";

const app = createApp({ rooms: new RoomService(new MemoryRoomStore()), questions: new MemoryQuestionRepository(), adminKey: process.env.ADMIN_KEY });
const server = createServer(app);
const port = Number(process.env.PORT ?? "3000");
server.listen(port, () => console.log(`casino server listening on ${port}`));
