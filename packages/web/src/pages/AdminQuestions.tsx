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
      <div className="screen screen--narrow page-enter" style={{ paddingBlock: "clamp(32px,8vw,80px)" }}>
        <div className="panel panel--gold">
          <div className="stack stack--lg">
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow">محمي</span>
              <h1 style={{ fontSize: 26 }}>إدارة الأسئلة</h1>
              <p className="muted" style={{ fontSize: 14 }}>اكتب مفتاح الأدمن عشان تفتح بنك الأسئلة.</p>
            </div>
            <div className="field">
              <label htmlFor="admin-key">مفتاح الأدمن</label>
              <input id="admin-key" className="input" aria-label="مفتاح الأدمن" value={key} onChange={(e) => setKey(e.target.value)} />
            </div>
            <button type="button" className="btn btn--gold btn--block" onClick={login}>دخول</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen admin page-enter">
      <div className="row row--between">
        <div className="stack" style={{ gap: 2 }}>
          <span className="eyebrow">بنك الأسئلة</span>
          <h1 style={{ fontSize: 28 }}>إدارة الأسئلة</h1>
        </div>
        <span className="pill pill--gold">{items.length} سؤال محمّل</span>
      </div>

      <div className="panel">
        <div className="panel__head">
          <span className="panel__title">الأسئلة</span>
        </div>
        <div className="admin__list">
          {items.map((q) => (
            <div className="admin__item" key={q.id}>
              <span>{q.text}</span>
              <small>{q.categorySlug} · {q.type}</small>
            </div>
          ))}
          {items.length === 0 && <div className="empty-note">مفيش أسئلة معروضة.</div>}
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <span className="panel__title">استيراد JSON</span>
        </div>
        <div className="stack">
          <div className="field">
            <label htmlFor="admin-json">أسئلة JSON</label>
            <textarea id="admin-json" className="input" aria-label="أسئلة JSON" value={json} onChange={(e) => setJson(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn" onClick={importJson}>استيراد</button>
            <button type="button" className="btn btn--gold" onClick={importJson}>نفّذ الاستيراد</button>
          </div>
          {report && <div className="console__hint" role="status">{report}</div>}
        </div>
      </div>
    </div>
  );
}
