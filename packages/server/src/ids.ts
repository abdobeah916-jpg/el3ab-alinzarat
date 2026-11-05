import { randomInt } from "node:crypto";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateRoomCode(rand: () => number = () => randomInt(0, ALPHABET.length)): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[rand() % ALPHABET.length];
  return code;
}
