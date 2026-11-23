export function GitHubIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function TerminalIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="4.5" />
      <path d="M8 10l2.5 2L8 14" />
      <path d="M13 14h3" />
    </svg>
  );
}

export function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </svg>
  );
}

export function KeyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="15.5" r="4.5" />
      <path d="M11.3 12.2 19 4.5" />
      <path d="M16.5 7 19 9.5" />
      <path d="M18.8 4.7 20.8 6.7" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function LayersIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.4 3.5a3.5 3.5 0 0 1 3.2 0l6.4 3.2a1.4 1.4 0 0 1 0 2.5l-6.4 3.2a3.5 3.5 0 0 1-3.2 0L4 9.2a1.4 1.4 0 0 1 0-2.5l6.4-3.2Z" />
      <path d="M3.5 13.3 10.4 16.8a3.5 3.5 0 0 0 3.2 0l6.9-3.5" />
      <path d="M3.5 17.5 10.4 21a3.5 3.5 0 0 0 3.2 0l6.9-3.5" />
    </svg>
  );
}

export function TrashIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9.5 4a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1.5h4.25a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1 0-1.5H9.5V4Zm1.5 0v1.5h2V4a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.5 9a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 .75.75v8.5A3.5 3.5 0 0 1 14 21h-4a3.5 3.5 0 0 1-3.5-3.5V9Zm3.75 2.25a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75Zm3.5 0a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75Z"
        fill="currentColor"
        fillOpacity={0.82}
      />
    </svg>
  );
}

export function PencilIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5" />
      <path d="M18.5 3.5a2.12 2.12 0 0 1 3 3L12 16l-4 1 1-4 9.5-9.5Z" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.5 4H19a1 1 0 0 1 1 1v4.5" />
      <path d="M11 13 19.5 4.5" />
      <path d="M19 13.5V16.5A3.5 3.5 0 0 1 15.5 20h-8A3.5 3.5 0 0 1 4 16.5v-8A3.5 3.5 0 0 1 7.5 5h3" />
    </svg>
  );
}

export function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 15.5v1A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-1" />
      <path d="M12 4v11" />
      <path d="m8 11.5 4 4 4-4" />
    </svg>
  );
}

export function LogOutIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.5 20H7.5A3.5 3.5 0 0 1 4 16.5v-9A3.5 3.5 0 0 1 7.5 4h3" />
      <path d="m15.5 16 4-4-4-4" />
      <path d="M19.5 12H9.5" />
    </svg>
  );
}

export function FolderIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 8.5A3.5 3.5 0 0 1 6.5 5h2.25c.92 0 1.78.43 2.34 1.16l.52.68c.56.73 1.42 1.16 2.34 1.16H17.5A3.5 3.5 0 0 1 21 11.5v5a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 16.5v-8Z" />
    </svg>
  );
}

export function GlobeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <ellipse cx="12" cy="12" rx="4.2" ry="9.5" />
      <path d="M2.5 12h19" />
    </svg>
  );
}
