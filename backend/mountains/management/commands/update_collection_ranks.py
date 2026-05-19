from django.core.management.base import BaseCommand

from mountains.models import MountainCollection, MountainCollectionMembership


class Command(BaseCommand):
    help = "Update rank_in_collection for mountain collection memberships."

    def handle(self, *args, **options):
        updated_count = 0

        for collection in MountainCollection.objects.all():
            memberships = (
                MountainCollectionMembership.objects.filter(
                    collection=collection
                )
                .select_related("mountain")
                .order_by("-mountain__height_m", "mountain__name")
            )

            for index, membership in enumerate(memberships, start=1):
                membership.rank_in_collection = index
                membership.save(update_fields=["rank_in_collection"])
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {updated_count} collection membership ranks."
            )
        )