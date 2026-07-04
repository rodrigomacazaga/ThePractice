import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "ink",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "ink" | "paper";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <p className={tone === "paper" ? "eyebrow-light" : "eyebrow"}>{eyebrow}</p>
      )}
      <h2
        className={cn(
          "mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl",
          tone === "paper" ? "text-paper" : "text-ink"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed sm:text-lg",
            tone === "paper" ? "text-paper/65" : "text-stone-deep"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
