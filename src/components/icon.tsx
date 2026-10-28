import type { SVGProps } from "react";

const paths = {
  message:
    "M7 9h10M7 13h6M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1v-9.5A8.5 8.5 0 0 1 11.5 3h1a8.5 8.5 0 0 1 8.5 8.5Z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M6 10h12a1 1 0 0 1 1 1v9H5v-9a1 1 0 0 1 1-1ZM12 14v3",
  send: "m21 3-7 18-4-7-7-4L21 3ZM10 14 21 3",
  inbox: "M4 5h16l2 10v5H2v-5L4 5ZM2 15h6l2 3h4l2-3h6M9 9h6",
} as const;

export function Icon({ name, ...props }: { name: keyof typeof paths } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
