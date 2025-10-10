/**
 * Logo component for Anamnesportalen.
 * Displays the application logo with consistent sizing and styling.
 */

import logo from "@/assets/logo.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12"
  };

  return (
    <img 
      src={logo} 
      alt="Anamnesportalen" 
      className={`${sizeClasses[size]} w-auto ${className}`}
    />
  );
};
