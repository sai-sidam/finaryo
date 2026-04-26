import type { ReactNode } from "react";

type CardProps = {
  className?: string;
  children: ReactNode;
};

function Card({ className = "", children }: CardProps) {
  const mergedClassName = className ? `card ${className}` : "card";
  return <section className={mergedClassName}>{children}</section>;
}

export default Card;
