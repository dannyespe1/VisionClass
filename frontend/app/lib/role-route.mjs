export function roleRoute(profile) {
  if (profile.is_staff || profile.is_superuser || profile.role === "admin") return "/admin";
  if (profile.role === "researcher") return "/research";
  if (profile.role === "teacher") return "/instructor";
  return "/student";
}
