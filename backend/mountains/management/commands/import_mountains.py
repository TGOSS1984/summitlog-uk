import csv
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from mountains.models import Mountain, MountainCollection, Region, SubRegion


CLASSIFICATION_COLLECTIONS = {
    "W": {
        "name": "Wainwrights",
        "slug": "wainwrights",
        "region": "Lake District",
        "expected_total": 214,
    },
    "M": {
        "name": "Munros",
        "slug": "munros",
        "region": "Scotland",
        "expected_total": 282,
    },
    "N": {
        "name": "Nuttalls",
        "slug": "nuttalls",
        "region": "England and Wales",
        "expected_total": 443,
    },
}


class Command(BaseCommand):
    help = "Import mountains from a CSV file."

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path",
            type=str,
            help="Path to the mountain CSV file.",
        )

        parser.add_argument(
            "--dobih",
            action="store_true",
            help="Import using DoBIH-style columns.",
        )

    def handle(self, *args, **options):
        csv_path = options["csv_path"]
        use_dobih_mapping = options["dobih"]

        try:
            with open(csv_path, newline="", encoding="utf-8-sig") as csv_file:
                reader = csv.DictReader(csv_file)
                created_count = 0
                updated_count = 0
                skipped_count = 0

                for row in reader:
                    rows_to_import = (
                        self.build_dobih_rows(row)
                        if use_dobih_mapping
                        else [self.build_standard_row(row)]
                    )

                    for import_row in rows_to_import:
                        if not import_row:
                            skipped_count += 1
                            continue

                        created = self.import_row(import_row)

                        if created:
                            created_count += 1
                        else:
                            updated_count += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Import complete. Created {created_count}, "
                        f"updated {updated_count}, skipped {skipped_count}."
                    )
                )

        except FileNotFoundError as exc:
            raise CommandError(f"CSV file not found: {csv_path}") from exc

    def build_standard_row(self, row):
        collection_name = row.get("collection", "").strip()

        return {
            "name": row.get("name", "").strip(),
            "slug": row.get("slug", "").strip(),
            "collection": collection_name,
            "collection_slug": slugify(collection_name),
            "region": row.get("region", "").strip(),
            "subregion": row.get("subregion", "").strip(),
            "height_m": row.get("height_m"),
            "height_ft": row.get("height_ft"),
            "prominence_m": row.get("prominence_m"),
            "rank_in_collection": row.get("rank_in_collection"),
            "latitude": row.get("latitude"),
            "longitude": row.get("longitude"),
            "summary": row.get("summary", ""),
            "expected_total": 0,
        }

    def build_dobih_rows(self, row):
        classification = row.get("Classification", "")
        classification_codes = {
            item.strip()
            for item in classification.split(",")
            if item.strip()
        }

        rows = []

        for code, collection_data in CLASSIFICATION_COLLECTIONS.items():
            if code not in classification_codes:
                continue

            name = row.get("Name", "").strip()

            if not name:
                continue

            area = (
                row.get("Area", "")
                or row.get("Area (Nuttalls)", "")
                or row.get("Section", "")
                or row.get("Section/Region", "")
            )

            rows.append(
                {
                    "name": name,
                    "slug": slugify(f"{collection_data['slug']}-{name}"),
                    "collection": collection_data["name"],
                    "collection_slug": collection_data["slug"],
                    "region": collection_data["region"],
                    "subregion": area.strip(),
                    "height_m": row.get("Metres") or row.get("Height (m)"),
                    "height_ft": row.get("Feet") or row.get("Height (ft)"),
                    "prominence_m": row.get("Drop") or row.get("Prom. (m)"),
                    "rank_in_collection": "",
                    "latitude": row.get("Latitude"),
                    "longitude": row.get("Longitude"),
                    "summary": (
                        f"{name} is listed in the "
                        f"{collection_data['name']} collection."
                    ),
                    "expected_total": collection_data["expected_total"],
                }
            )

        return rows

    def import_row(self, row):
        collection = self.get_or_create_collection(row)
        region = self.get_or_create_region(row)
        subregion = self.get_or_create_subregion(row, region)

        slug = row["slug"] or slugify(row["name"])

        _, created = Mountain.objects.update_or_create(
            collection=collection,
            name=row["name"],
            defaults={
                "slug": slug,
                "region": region,
                "subregion": subregion,
                "height_m": self.to_decimal(row.get("height_m")),
                "height_ft": self.to_int(row.get("height_ft")),
                "prominence_m": self.to_decimal(row.get("prominence_m")),
                "rank_in_collection": self.to_int(
                    row.get("rank_in_collection")
                ),
                "latitude": self.to_decimal(row.get("latitude")),
                "longitude": self.to_decimal(row.get("longitude")),
                "summary": row.get("summary", ""),
                "image_placeholder": f"/images/mountains/{slug}.jpg",
            },
        )

        return created

    def get_or_create_collection(self, row):
        name = row["collection"].strip()

        collection, _ = MountainCollection.objects.update_or_create(
            slug=row["collection_slug"] or slugify(name),
            defaults={
                "name": name,
                "description": f"{name} mountain collection.",
                "expected_total": row.get("expected_total") or 0,
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

        return Decimal(str(value).replace(",", ""))

    def to_int(self, value):
        if value in (None, ""):
            return None

        return int(float(str(value).replace(",", "")))