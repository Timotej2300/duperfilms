import Link from "next/link";

type Props = { size?: "sm" | "md" | "xl"; href?: string | null };

const SIZES = { sm: "text-xl", md: "text-3xl", xl: "text-6xl sm:text-8xl" } as const;

export function Logo({ size = "md", href = "/" }: Props) {
  const text = (
    <span
      className={`logo-shimmer select-none font-black uppercase tracking-[0.18em] ${SIZES[size]}`}
      aria-label="DuperFilms"
    >
      DuperFilms
    </span>
  );
  return href ? (
    <Link href={href} className="inline-block">
      {text}
    </Link>
  ) : (
    text
  );
}
