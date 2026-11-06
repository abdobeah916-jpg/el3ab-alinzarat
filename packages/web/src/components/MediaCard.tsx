export function MediaCard({ src, credit }: { src?: string; credit?: string }) {
  if (!src) return null;
  return (
    <figure className="question-media">
      <img src={src} alt="" />
      {credit && <figcaption>{credit}</figcaption>}
    </figure>
  );
}
