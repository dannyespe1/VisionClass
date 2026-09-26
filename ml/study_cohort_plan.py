"""Fail-closed cohort planning for the real VisionClass ML study.

The planner accepts research pseudonyms only.  It keeps the pilot outside the
model-development and confirmatory cohorts and creates a participant-exclusive,
deterministic split that can be frozen before outcomes are inspected.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from typing import Iterable
from uuid import UUID


PILOT_MIN = 15
PILOT_MAX = 20
STUDY_TOTAL = 100
ALLOWED_STUDY_SPLITS = ((60, 40), (70, 30))


class CohortPlanError(ValueError):
    """Raised when a cohort plan could leak identity or invalidate evaluation."""


@dataclass(frozen=True)
class CohortPlan:
    pilot: tuple[str, ...]
    development: tuple[str, ...]
    confirmatory: tuple[str, ...]
    seed_reference: str
    roster_sha256: str
    assignment_sha256: str

    def public_manifest(self) -> dict[str, object]:
        """Return an auditable manifest without participant-level identifiers."""

        return {
            "schema_version": "visionclass-cohort-plan-v1",
            "unit_of_split": "participant",
            "pilot_participants": len(self.pilot),
            "development_participants": len(self.development),
            "confirmatory_participants": len(self.confirmatory),
            "study_participants": len(self.development) + len(self.confirmatory),
            "seed_reference": self.seed_reference,
            "roster_sha256": self.roster_sha256,
            "assignment_sha256": self.assignment_sha256,
            "pilot_reuse_permitted": False,
            "confirmatory_access_before_model_freeze": False,
        }


def _validate_pseudonyms(values: Iterable[str], cohort: str) -> tuple[str, ...]:
    normalized: list[str] = []
    for raw_value in values:
        value = str(raw_value).strip()
        if not value or len(value) > 128:
            raise CohortPlanError(f"invalid_pseudonym_in_{cohort}")
        lowered = value.casefold()
        if "@" in value or "mailto:" in lowered or lowered.startswith(("email:", "name:", "correo:")):
            raise CohortPlanError(f"direct_identifier_in_{cohort}")
        try:
            normalized.append(str(UUID(value)))
        except ValueError as exc:
            raise CohortPlanError(f"non_opaque_pseudonym_in_{cohort}") from exc
    if len(set(normalized)) != len(normalized):
        raise CohortPlanError(f"duplicate_pseudonym_in_{cohort}")
    return tuple(normalized)


def _digest_lines(values: Iterable[str]) -> str:
    payload = "\n".join(sorted(values)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _rank(seed_reference: str, pseudonym: str) -> str:
    return hashlib.sha256(f"{seed_reference}\0{pseudonym}".encode("utf-8")).hexdigest()


def create_cohort_plan(
    *,
    pilot_pseudonyms: Iterable[str],
    study_pseudonyms: Iterable[str],
    development_size: int,
    seed_reference: str,
) -> CohortPlan:
    """Create the frozen pilot/development/confirmatory participant allocation.

    ``development`` includes all fitting, tuning, threshold selection and
    participant-grouped internal validation.  ``confirmatory`` is an untouched
    holdout and must not be opened before the model and threshold are frozen.
    """

    pilot = _validate_pseudonyms(pilot_pseudonyms, "pilot")
    study = _validate_pseudonyms(study_pseudonyms, "study")
    if not PILOT_MIN <= len(pilot) <= PILOT_MAX:
        raise CohortPlanError("pilot_size_must_be_between_15_and_20")
    if len(study) != STUDY_TOTAL:
        raise CohortPlanError("study_size_must_equal_100")
    if set(pilot) & set(study):
        raise CohortPlanError("pilot_participant_reuse_forbidden")
    confirmatory_size = STUDY_TOTAL - development_size
    if (development_size, confirmatory_size) not in ALLOWED_STUDY_SPLITS:
        raise CohortPlanError("study_split_must_be_60_40_or_70_30")
    if not seed_reference or len(seed_reference.strip()) < 8:
        raise CohortPlanError("seed_reference_must_be_auditable")

    ranked = tuple(sorted(study, key=lambda value: (_rank(seed_reference, value), value)))
    development = ranked[:development_size]
    confirmatory = ranked[development_size:]
    roster_sha256 = _digest_lines((*pilot, *study))
    assignment_payload = json.dumps(
        {
            "pilot": sorted(pilot),
            "development": list(development),
            "confirmatory": list(confirmatory),
            "seed_reference": seed_reference,
        },
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return CohortPlan(
        pilot=tuple(sorted(pilot)),
        development=development,
        confirmatory=confirmatory,
        seed_reference=seed_reference,
        roster_sha256=roster_sha256,
        assignment_sha256=hashlib.sha256(assignment_payload).hexdigest(),
    )
