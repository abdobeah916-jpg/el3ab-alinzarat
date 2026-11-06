import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.2 16.4c1-1.1 1.6-2.5 1.6-4V9.6a4.2 4.2 0 0 1 8.4 0v2.8c0 1.5.6 2.9 1.6 4z" />
      <path d="M10.4 19.2a1.8 1.8 0 0 0 3.2 0" />
      <path d="M12 3.2V2" />
    </Svg>
  );
}

export function CrownIcon(props: IconProps) {
  return (
    <Svg {...props} fill="currentColor" stroke="none">
      <path d="M3 17h18l-1.6-8.3-4.1 3.1L12 5.6 8.7 11.8 4.6 8.7z" />
      <rect x="3.4" y="18.4" width="17.2" height="1.9" rx="0.95" />
    </Svg>
  );
}

export function CardsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7.5" y="3.5" width="9" height="13" rx="1.6" transform="rotate(10 12 10)" />
      <rect x="3.5" y="6.5" width="9" height="13" rx="1.6" transform="rotate(-8 8 13)" />
    </Svg>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13.5" r="7.2" />
      <path d="M12 10.4v3.4l2.2 1.4" />
      <path d="M9.6 2.8h4.8" />
    </Svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.1" />
      <path d="M3.4 19.2c.4-3 2.7-4.9 5.6-4.9s5.2 1.9 5.6 4.9" />
      <path d="M16.2 5.2a3 3 0 0 1 0 5.8" />
      <path d="M17.6 14.7c1.8.5 2.9 2.1 3.1 4.5" />
    </Svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2l1.9 5.2 5.2 1.9-5.2 1.9L12 17.4l-1.9-5.2L4.9 10.3l5.2-1.9z" />
      <path d="M18.4 16.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
    </Svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.6 4h8.8v3.4a4.4 4.4 0 0 1-8.8 0z" />
      <path d="M7.6 5.4H5.2a2.9 2.9 0 0 0 2.9 2.9M16.4 5.4h2.4a2.9 2.9 0 0 1-2.9 2.9" />
      <path d="M12 11.8V15M8.6 20h6.8M9.6 20l.7-3.2h3.4l.7 3.2" />
    </Svg>
  );
}

export function SkullIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2c-4.1 0-7 2.8-7 6.6 0 2.3 1 3.9 2.4 5v2.2h9.2v-2.2c1.4-1.1 2.4-2.7 2.4-5 0-3.8-2.9-6.6-7-6.6z" />
      <circle cx="9.5" cy="10" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="1.15" fill="currentColor" stroke="none" />
      <path d="M11 13.4l1-1 1 1M10.4 19.5v1.3M13.6 19.5v1.3" />
    </Svg>
  );
}

export function BridgeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 16.5h18" />
      <path d="M5.2 16.5v-4.2a6.8 6.8 0 0 1 13.6 0v4.2" />
      <path d="M5.2 12.3h13.6M9 8.2v8.3M15 8.2v8.3" />
    </Svg>
  );
}

export function LadderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 3.2 6.2 20.8M16.5 3.2l1.3 17.6" />
      <path d="M7.1 8h9.8M6.7 12.4h10.6M6.3 16.8h11.4" />
    </Svg>
  );
}

export function BroadcastIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="12.5" rx="2" />
      <path d="M8 21h8M12 17.5V21" />
    </Svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props} fill="currentColor" stroke="none">
      <path d="M8 5.4 18.4 12 8 18.6z" />
    </Svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.4 12H5.2M11.4 5.6 5 12l6.4 6.4" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8.4" y="8.4" width="11" height="11" rx="2" />
      <path d="M15.6 5.6a2 2 0 0 0-2-2h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.8 12.6 9.4 17l9.8-10" />
    </Svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function ChipIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.6" strokeDasharray="2 2.4" />
      <path d="M12 3.6v3M12 17.4v3M3.6 12h3M17.4 12h3" />
    </Svg>
  );
}
