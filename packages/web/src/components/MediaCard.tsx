export function MediaCard({ src, credit }: { src?: string; credit?: string }) {
  if (!src) return null;
  return (
    <figure>
      <img src={src} alt="" />
      <figcaption>{credit}</figcaption>
    </figure>
  );
}
