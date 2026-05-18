from django.db import models


class MountainCollection(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)
    expected_total = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Region(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class SubRegion(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140)
    region = models.ForeignKey(
        Region,
        on_delete=models.CASCADE,
        related_name="subregions",
    )
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["region__name", "name"]
        unique_together = ["region", "slug"]

    def __str__(self):
        return f"{self.name} ({self.region.name})"


class Mountain(models.Model):
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)

    collection = models.ForeignKey(
        MountainCollection,
        on_delete=models.PROTECT,
        related_name="mountains",
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.PROTECT,
        related_name="mountains",
    )
    subregion = models.ForeignKey(
        SubRegion,
        on_delete=models.SET_NULL,
        related_name="mountains",
        blank=True,
        null=True,
    )

    height_m = models.DecimalField(max_digits=7, decimal_places=2)
    height_ft = models.PositiveIntegerField(blank=True, null=True)
    prominence_m = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        blank=True,
        null=True,
    )

    rank_in_collection = models.PositiveIntegerField(blank=True, null=True)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
    )

    summary = models.TextField(blank=True)
    image_placeholder = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["collection__name", "rank_in_collection", "name"]
        unique_together = ["collection", "name"]

    def __str__(self):
        return self.name