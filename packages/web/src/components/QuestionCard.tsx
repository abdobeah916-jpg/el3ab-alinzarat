export function QuestionCard({ question, showAnswer }: { question: any; showAnswer?: boolean }) {
  if (!question) return <p className="question question--waiting">مفيش سؤال لسه…</p>;
  return (
    <div className="stack">
      <p className="question">{question.text}</p>
      {showAnswer && (
        <div className="answer" data-testid="question-answer">
          <span className="answer__label">الإجابة الصح</span>
          <span className="answer__text">{question.answer}</span>
        </div>
      )}
      {question.mediaUrl && (
        <figure className="question-media">
          <img src={question.mediaUrl} alt={question.text} />
          {question.mediaCredit && <figcaption>{question.mediaCredit}</figcaption>}
        </figure>
      )}
    </div>
  );
}
