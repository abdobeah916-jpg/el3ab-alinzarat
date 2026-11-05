import type { RoomState } from "@casino/shared";
import type { CommandResult } from "./machine";
const stub = (): CommandResult => ({ ok: false, code: "wrong_state", message: "use machine" });
export function submitRumbleAnswer(_s: RoomState, _p: string, _a: string, _at: number): CommandResult { return stub(); }
export function setRumbleVerdict(_s: RoomState, _p: string, _v: "correct" | "wrong", _at: number): CommandResult { return stub(); }
export function confirmRumbleResult(_s: RoomState, _at: number): CommandResult { return stub(); }
export const RUMBLE_SECONDS = 30;
