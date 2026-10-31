import { siApple, siGithub } from "simple-icons";

// lucide-react dropped brand logos, so these live here.

export function GithubIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg role="img" aria-label="GitHub" viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d={siGithub.path} />
    </svg>
  );
}

export function LinkedinIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg role="img" aria-label="LinkedIn" viewBox="0 0 24 24" width={size} height={size} className={className}>
      <rect width="24" height="24" rx="4" fill="currentColor" />
      <text x="12" y="17.5" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="Arial, sans-serif" fill="white">
        in
      </text>
    </svg>
  );
}

export function AppleIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d={siApple.path} />
    </svg>
  );
}
