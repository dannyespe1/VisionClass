export const BOUNDED_CAPTURE_QUEUE_ENABLED =
  process.env.NEXT_PUBLIC_BOUNDED_CAPTURE_QUEUE !== "false";

export const CAPTURE_DEADLINE_MS = Math.max(
  500,
  Number(process.env.NEXT_PUBLIC_CAPTURE_DEADLINE_MS || "4500"),
);
