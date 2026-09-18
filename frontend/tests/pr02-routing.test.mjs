import assert from "node:assert/strict";
import test from "node:test";

import { roleRoute } from "../app/lib/role-route.mjs";

const student = { role: "student", is_staff: false, is_superuser: false };

test("a student enters the main journey directly", () => {
  assert.equal(roleRoute(student), "/student");
});

test("teacher and administrator routes depend only on role", () => {
  assert.equal(
    roleRoute({ role: "teacher", is_staff: false, is_superuser: false }),
    "/instructor",
  );
  assert.equal(
    roleRoute({ role: "student", is_staff: true, is_superuser: false }),
    "/admin",
  );
  assert.equal(
    roleRoute({ role: "admin", is_staff: false, is_superuser: false }),
    "/admin",
  );
});
