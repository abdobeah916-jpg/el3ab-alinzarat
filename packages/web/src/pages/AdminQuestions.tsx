import { useState } from "react";

export function AdminQuestions({ api, initialKey }: { api?: any; initialKey?: string } = {}) {
  const [key, setKey] = useState(initialKey ?? "");
  const [items, setItems] = useState<any[]>([]);
  const [json, setJson] = useState("[]");
  const [report, setReport] = useState("");

  async function login() {
    const data = await api.list();
    setItems(data.items);
  }
  async function importJson() {
    const data = await api.importJson(JSON.parse(json));
    setReport(`تمت إضافة ${data.inserted}`);
  }
  if (!initialKey && items.length === 0) {
    return (
      <div>
        <label>مفتاح الأدمن<input aria-label="مفتاح الأدمن" value={key} onChange={(e) => setKey(e.target.value)} /></label>
        <button onClick={login}>دخول</button>
      </div>
    );
  }
  return (
    <div>
      <h2>إدارة الأسئلة</h2>
      {items.map((q) => <div key={q.id}>{q.text}</div>)}
      <button onClick={importJson}>استيراد</button>
      <label>أسئلة JSON<input aria-label="أسئلة JSON" value={json} onChange={(e) => setJson(e.target.value)} /></label>
      <button onClick={importJson}>نفّذ الاستيراد</button>
      {report && <div>{report}</div>}
    </div>
  );
}
