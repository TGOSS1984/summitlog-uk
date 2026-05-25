from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
    ("progress", "0002_usermountainlog_flights_climbed_and_more"),
    ]

    operations = [
        # Remove the unique_together constraint to allow multiple ascents
        migrations.AlterUniqueTogether(
            name="usermountainlog",
            unique_together=set(),
        ),
        # Add season field
        migrations.AddField(
            model_name="usermountainlog",
            name="season",
            field=models.CharField(
                blank=True,
                choices=[
                    ("summer", "Summer"),
                    ("winter", "Winter"),
                    ("spring", "Spring"),
                    ("autumn", "Autumn"),
                ],
                max_length=10,
            ),
        ),
        # Update ordering to use completed_date
        migrations.AlterModelOptions(
            name="usermountainlog",
            options={"ordering": ["-completed_date", "-updated_at"]},
        ),
    ]