"""
One-off cleanup: removes the original demo-fixture mountains (and the
demo-only "Welsh Nuttalls" collection) that got duplicated once the real
DOBIH dataset was imported via `import_mountains --dobih`.
"""

from django.core.management.base import BaseCommand

from mountains.models import Mountain, MountainCollection, MountainCollectionMembership

DEMO_MOUNTAIN_SLUGS_TO_REMOVE = [
    "scafell-pike",
    "helvellyn",
    "ben-nevis",
    "snowdon-yr-wyddfa",
]


class Command(BaseCommand):
    help = "Remove leftover demo-fixture mountains superseded by the full DOBIH import."

    def handle(self, *args, **options):
        removed = 0

        for slug in DEMO_MOUNTAIN_SLUGS_TO_REMOVE:
            mountain = Mountain.objects.filter(slug=slug).first()
            if mountain:
                MountainCollectionMembership.objects.filter(mountain=mountain).delete()
                mountain.delete()
                removed += 1
                self.stdout.write(f"Removed duplicate demo entry: {slug}")

        orphan = MountainCollection.objects.filter(
            slug="welsh-nuttalls",
            mountains__isnull=True,
        ).first()
        if orphan:
            orphan.delete()
            self.stdout.write("Removed empty 'Welsh Nuttalls' collection.")

        self.stdout.write(
            self.style.SUCCESS(f"Cleanup complete. Removed {removed} duplicate mountain(s).")
        )