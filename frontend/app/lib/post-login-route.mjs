export function postLoginRoute(profile, options = {}) {
  if (profile.role === "admin" || profile.is_superuser || profile.is_staff) {
    return "/admin";
  }
  if (profile.role === "teacher") {
    return "/instructor";
  }
  if (options.d2rEnabled && !options.hasD2RResult) {
    return "/d2r";
  }
  return "/student";
}
