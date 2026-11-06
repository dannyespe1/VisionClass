type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: SectionHeaderProps) {
  const alignment = align === "center" ? "mx-auto items-center text-center" : "items-start";

  return (
    <div className={`flex max-w-3xl flex-col ${alignment}`}>
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-aten-primary sm:text-sm">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-aten-text sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-7 text-aten-text-muted sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}
