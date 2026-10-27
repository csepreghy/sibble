import { Link } from "@tanstack/react-router";
import sibbleLogo from "@/assets/sibble-logo.png.asset.json";

interface BrandLogoProps {
  className?: string;
  to?: "/" | "/lobby";
}

export function BrandLogo({ className = "h-12 w-auto", to = "/" }: BrandLogoProps) {
  return (
    <Link to={to} aria-label="Sibble home" className="inline-flex shrink-0 items-center">
      <img src={sibbleLogo.url} alt="Sibble" className={className} />
    </Link>
  );
}