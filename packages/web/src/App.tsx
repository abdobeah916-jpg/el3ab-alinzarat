import { Router } from "./router";
import { Toast } from "./components/Toast";

export function App() {
  return (
    <>
      <div className="bg" aria-hidden="true">
        <span className="bg__glow" />
        <span className="bg__glow bg__glow--2" />
        <span className="bg__noise" />
        <span className="bg__vignette" />
      </div>
      <Router />
      <Toast />
    </>
  );
}
