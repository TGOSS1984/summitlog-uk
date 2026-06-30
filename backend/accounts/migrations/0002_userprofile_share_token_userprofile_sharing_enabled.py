import uuid

from django.db import migrations, models


def assign_unique_share_tokens(apps, schema_editor):
    """Explicitly assigns a fresh uuid4 to every existing row via real
    Python code, rather than relying on the database to evaluate a
    callable default per-row — which Postgres does not reliably do,
    and was the actual cause of the production deploy failure this
    migration originally produced."""
    UserProfile = apps.get_model("accounts", "UserProfile")
    for profile in UserProfile.objects.all():
        profile.share_token = uuid.uuid4()
        profile.save(update_fields=["share_token"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        # Step 1: add the column without a uniqueness constraint yet —
        # safe regardless of backend, since duplicate values don't
        # violate anything at this point.
        migrations.AddField(
            model_name="userprofile",
            name="share_token",
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="sharing_enabled",
            field=models.BooleanField(default=False),
        ),
        # Step 2: explicitly give every existing row its own distinct
        # value before uniqueness is enforced.
        migrations.RunPython(assign_unique_share_tokens, noop_reverse),
        # Step 3: now that every row genuinely has a distinct value,
        # it's safe to add the uniqueness constraint.
        migrations.AlterField(
            model_name="userprofile",
            name="share_token",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]