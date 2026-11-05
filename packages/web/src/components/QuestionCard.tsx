export function QuestionCard({ question, showAnswer }: { question: any; showAnswer?: boolean }) {
  if (!question) return <div>مفيش سؤال</div>;
  return (
    <div style={{ border: "1px solid var(--gold)", borderRadius: 16, padding: 16 }}>
      <div>{question.text}</div>
      {showAnswer && <div data-testid="question-answer">{question.answer}</div>}
      {question.mediaUrl && (
        <figure>
          <img src={question.mediaUrl} alt={question.text} />
          <figcaption>{question.mediaCredit}</figcaption>
        </figure>
      )}
    </div>
  );
}
