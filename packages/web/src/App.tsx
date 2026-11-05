import { Router } from "./router";
import { Toast } from "./components/Toast";
export function App() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <strong style={{ color: "var(--gold)", fontSize: 22 }}>كازينو الألعاب</strong>
      </header>
      <Router />
      <Toast />
    </div>
  );
}
