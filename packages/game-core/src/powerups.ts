import type { RoomState, State } from "@casino/shared";
import type { CommandResult } from "./machine";

export function requestPowerup(_state: RoomState, _ownerId: string, _key: string, _payload: unknown, _at: number): CommandResult { return { ok: false, code: "wrong_state", message: "use machine" }; }
export function resolvePowerup(_state: RoomState, _approve: boolean, _at: number): CommandResult { return { ok: false, code: "wrong_state", message: "use machine" }; }
export function chooseSalemTarget(_state: RoomState, _ownerId: string, _targetId: string, _at: number): CommandResult { return { ok: false, code: "wrong_state", message: "use machine" }; }
export function powerupReturnState(pending: { returnState: State } | null): State { return pending?.returnState ?? "ready"; }
