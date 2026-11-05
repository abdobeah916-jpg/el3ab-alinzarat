import type { RoomState } from "@casino/shared";
import type { CommandResult } from "./machine";
type R = CommandResult;
const stub = (): R => ({ ok: false, code: "wrong_state", message: "use machine" });
export function setBusLetter(_s: RoomState, _l: string, _at: number): R { return stub(); }
export function submitBusAnswers(_s: RoomState, _p: string, _a: Record<string,string>, _at: number): R { return stub(); }
export function callBus(_s: RoomState, _p: string, _at: number): R { return stub(); }
export function closeSubmissions(_s: RoomState, _at: number): R { return stub(); }
export function judgeBusCell(_s: RoomState, _p: string, _c: string, _a: boolean, _at: number): R { return stub(); }
export function approveAllBusCells(_s: RoomState, _at: number): R { return stub(); }
