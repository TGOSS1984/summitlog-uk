import csv
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from mountains.models import Mountain, MountainCollection, Region, SubRegion


class Command(BaseCommand):
    help = "Import mountains from a CSV file."

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path",
            type=str,
            help="Path to the mountain CSV file.",
        )

    def handle(self, *args, **options):
        csv_path = options["csv_path"]

        try:
            with open(csv_path, newline="", encoding="utf-8") as csv_file:
                reader = csv.DictReader(csv_file)
                created_count = 0
                updated_count = 0

                for row in reader:
                    collection = self.get_or_create_collection(row)
                    region = self.get_or_create_region(row)
                    subregion = self.get_or_create_subregion(row, region)

                    mountain, created = Mountain.objects.update_or_create(
                        slug=row["slug"] or slugify(row["name"]),
                        defaults={
                            "name": row["name"],
                            "collection": collection,
                            "region": region,
                            "subregion": subregion,
                            "height_m": self.to_decimal(row.get("height_m")),
                            "height_ft": self.to_int(row.get("height_ft")),
                            "prominence_m": self.to_decimal(
                                row.get("prominence_m")
                            ),
                            "rank_in_collection": self.to_int(
                                row.get("rank_in_collection")
                            ),
                            "latitude": self.to_decimal(row.get("latitude")),
                            "longitude": self.to_decimal(row.get("longitude")),
                            "summary": row.get("summary", ""),
                            "image_placeholder": (
                                f"/images/mountains/{row['slug']}.jpg"
                            ),
                        },
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Import complete. Created {created_count}, "
                        f"updated {updated_count}."
                    )
                )

        except FileNotFoundError as exc:
            raise CommandError(f"CSV file not found: {csv_path}") from exc

    def get_or_create_collection(self, row):
        name = row["collection"].strip()

        collection, _ = MountainCollection.objects.get_or_create(
            name=name,
            defaults={
                "slug": slugify(name),
                "description": f"{name} mountain collection.",
            },
        )

        return collection

    def get_or_create_region(self, row):
        name = row["region"].strip()

        region, _ = Region.objects.get_or_create(
            name=name,
            defaults={
                "slug": slugify(name),
                "description": f"{name} mountain region.",
            },
        )

        return region

    def get_or_create_subregion(self, row, region):
        name = row.get("subregion", "").strip()

        if not name:
            return None

        subregion, _ = SubRegion.objects.get_or_create(
            region=region,
            slug=slugify(name),
            defaults={
                "name": name,
                "description": f"{name} subregion.",
            },
        )

        return subregion

    def to_decimal(self, value):
        if value in (None, ""):
            return None

        return Decimal(str(value))

    def to_int(self, value):
        if value in (None, ""):
            return None

        return int(float(value))