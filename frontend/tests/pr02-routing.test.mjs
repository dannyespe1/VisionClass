import assert from "node:assert/strict";
import test from "node:test";

import { postLoginRoute } from "../app/lib/post-login-route.mjs";

const student = { role: "student", is_staff: false, is_superuser: false };

test("a student enters the main journey when D2R is disabled", () => {
  assert.equal(postLoginRoute(student, { d2rEnabled: false, hasD2RResult: false }), "/student");
});

test("the legacy student gate can be restored with the flag", () => {
  assert.equal(postLoginRoute(student, { d2rEnabled: true, hasD2RResult: false }), "/d2r");
  assert.equal(postLoginRoute(student, { d2rEnabled: true, hasD2RResult: true }), "/student");
});

test("teacher and administrator routes never depend on D2R", () => {
  assert.equal(
    postLoginRoute({ role: "teacher", is_staff: false, is_superuser: false }, { d2rEnabled: true }),
    "/instructor",
  );
  assert.equal(
    postLoginRoute({ role: "student", is_staff: true, is_superuser: false }, { d2rEnabled: true }),
    "/admin",
  );
  assert.equal(
    postLoginRoute({ role: "admin", is_staff: false, is_superuser: false }, { d2rEnabled: false }),
    "/admin",
  );
});
