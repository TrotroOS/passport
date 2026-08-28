"use client";

interface MarketingHeroTitleProps {
  title: string;
  highlight: string;
}

export function MarketingHeroTitle({ title, highlight }: MarketingHeroTitleProps) {
  const index = title.indexOf(highlight);

  if (index === -1) {
    return (
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
        {title}
      </h1>
    );
  }

  return (
    <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
      {title.slice(0, index)}
      <span className="marketing-gradient-text">{highlight}</span>
      {title.slice(index + highlight.length)}
    </h1>
  );
}
