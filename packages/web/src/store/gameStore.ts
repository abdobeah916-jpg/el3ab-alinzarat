import { create } from "zustand";

type State = {
  view: any;
  connection: "connected" | "reconnecting" | "disconnected";
  toast: string | null;
  setView: (v: any) => void;
  setConnection: (c: State["connection"]) => void;
  showToast: (t: string) => void;
};
export const useGameStore = create<State>((set) => ({
  view: null,
  connection: "disconnected",
  toast: null,
  setView: (view) => set({ view }),
  setConnection: (connection) => set({ connection }),
  showToast: (toast) => { set({ toast }); setTimeout(() => set({ toast: null }), 3000); },
}));
