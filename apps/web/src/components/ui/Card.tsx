"use client";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900 ${padded ? "p-4 sm:p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
