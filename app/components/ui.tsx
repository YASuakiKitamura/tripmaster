import type { ReactNode } from "react";

const TAG_STYLES: Record<string, string> = {
  blue: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue)]",
  green: "bg-[var(--tag-green-bg)] text-[var(--tag-green)]",
  orange: "bg-[var(--tag-orange-bg)] text-[var(--tag-orange)]",
  purple: "bg-[var(--tag-purple-bg)] text-[var(--tag-purple)]",
};

export function Tag({
  color = "blue",
  children,
}: {
  color?: "blue" | "green" | "orange" | "purple";
  children: ReactNode;
}) {
  return (
    <span
      className={`rounded-[10px] px-2 py-0.5 text-[11px] font-bold ${TAG_STYLES[color]}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="px-4 pt-5 pb-3">
      <h2 className="font-serif-jp flex items-center gap-2 text-[18px] font-bold text-[var(--accent-dark)]">
        <span className="text-[22px]">{emoji}</span>
        {title}
      </h2>
      {desc && <p className="mt-1 text-[12px] text-[var(--text-sub)]">{desc}</p>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 rounded-[8px] bg-[var(--accent-light)] px-2.5 py-2 text-[12px] leading-[1.5] text-[var(--accent-dark)]">
      {children}
    </div>
  );
}
