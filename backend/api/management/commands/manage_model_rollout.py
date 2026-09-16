import json

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from api.model_rollout import (
    create_alias,
    evaluate_and_rollback,
    promote,
    rollback,
    start_canary,
    start_shadow,
)
from api.models import ModelAlias, ModelArtifact


class Command(BaseCommand):
    help = "Manage audited model rollout aliases without exposing artifact content."

    def add_arguments(self, parser):
        parser.add_argument("action", choices=["create", "status", "shadow", "canary", "evaluate", "promote", "rollback"])
        parser.add_argument("--alias-id", type=int)
        parser.add_argument("--environment")
        parser.add_argument("--name")
        parser.add_argument("--active-model-id", type=int)
        parser.add_argument("--candidate-model-id", type=int)
        parser.add_argument("--percentage", type=int, default=0)
        parser.add_argument("--metrics-json", default="")
        parser.add_argument("--reason-code", default="manual_operator_rollback")
        parser.add_argument("--recorded-by", default="rollout-operator")

    def handle(self, *args, **options):
        action = options["action"]
        try:
            metrics = json.loads(options["metrics_json"]) if options["metrics_json"] else None
            if action == "create":
                if not all((options["environment"], options["name"], options["active_model_id"])):
                    raise CommandError("create requiere environment, name y active-model-id")
                alias = create_alias(
                    environment=options["environment"],
                    name=options["name"],
                    active_model=ModelArtifact.objects.get(pk=options["active_model_id"]),
                    recorded_by=options["recorded_by"],
                )
            else:
                if not options["alias_id"]:
                    raise CommandError("La acción requiere --alias-id")
                alias = ModelAlias.objects.get(pk=options["alias_id"])
                if action == "shadow":
                    if not options["candidate_model_id"]:
                        raise CommandError("shadow requiere --candidate-model-id")
                    alias = start_shadow(
                        alias.pk,
                        ModelArtifact.objects.get(pk=options["candidate_model_id"]),
                        recorded_by=options["recorded_by"],
                    )
                elif action == "canary":
                    alias = start_canary(alias.pk, options["percentage"], recorded_by=options["recorded_by"])
                elif action == "evaluate":
                    if metrics is None:
                        raise CommandError("evaluate requiere --metrics-json")
                    alias = evaluate_and_rollback(alias.pk, metrics, recorded_by=options["recorded_by"])
                elif action == "promote":
                    if metrics is None:
                        raise CommandError("promote requiere --metrics-json")
                    alias = promote(alias.pk, metrics, recorded_by=options["recorded_by"])
                elif action == "rollback":
                    alias = rollback(
                        alias.pk,
                        reason_code=options["reason_code"],
                        recorded_by=options["recorded_by"],
                        metrics=metrics,
                    )
            self.stdout.write(json.dumps({
                "alias_id": alias.pk,
                "environment": alias.environment,
                "name": alias.name,
                "mode": alias.mode,
                "active_version": alias.active_model.version,
                "candidate_version": alias.candidate_model.version if alias.candidate_model else None,
                "previous_version": alias.previous_model.version if alias.previous_model else None,
                "canary_percentage": alias.canary_percentage,
                "revision": alias.revision,
            }, sort_keys=True))
        except (ValidationError, ModelAlias.DoesNotExist, ModelArtifact.DoesNotExist, json.JSONDecodeError) as exc:
            raise CommandError(str(exc)) from exc
