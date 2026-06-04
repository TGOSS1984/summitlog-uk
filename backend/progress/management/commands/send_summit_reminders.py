"""
Management command: send_summit_reminders

Scans all users with email reminders enabled and sends a plain-text
email for any planned logs whose completed_date falls exactly
`reminder_days_before` days from today.

Usage:
    python manage.py send_summit_reminders

Schedule via cron or a GitHub Action to run daily, e.g.:
    0 7 * * * /path/to/venv/bin/python manage.py send_summit_reminders
"""

from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone

from progress.models import NotificationPreference, UserMountainLog


class Command(BaseCommand):
    help = "Send email reminders for upcoming planned summits."

    def handle(self, *args, **options):
        today  = timezone.now().date()
        sent   = 0
        errors = 0

        prefs = (
            NotificationPreference.objects
            .filter(email_reminders_enabled=True)
            .select_related("user")
        )

        self.stdout.write(f"Checking {prefs.count()} user(s) with reminders enabled…")

        for pref in prefs:
            user = pref.user

            if not user.email:
                self.stdout.write(self.style.WARNING(f"  Skipping {user.username} — no email address"))
                continue

            target_date = today + timedelta(days=pref.reminder_days_before)

            upcoming = (
                UserMountainLog.objects
                .filter(user=user, status="planned", completed_date=target_date)
                .select_related("mountain", "mountain__region")
            )

            if not upcoming.exists():
                continue

            count = upcoming.count()
            day_word  = "day"  if pref.reminder_days_before == 1 else "days"
            summit_word = "summit" if count == 1 else "summits"

            mountain_lines = "\n".join([
                f"  • {log.mountain.name} ({log.mountain.height_m}m)"
                + (f" — {log.mountain.region.name}" if log.mountain.region else "")
                + (f"\n    Route: {log.route_taken}" if log.route_taken else "")
                for log in upcoming
            ])

            subject = (
                f"SummitLog: {count} {summit_word} planned in "
                f"{pref.reminder_days_before} {day_word} "
                f"({target_date.strftime('%d %b %Y')})"
            )

            body = f"""Hi {user.username},

You have {count} planned {summit_word} coming up in {pref.reminder_days_before} {day_word} — on {target_date.strftime('%A %d %B %Y')}:

{mountain_lines}

Good luck on the hill!

— SummitLog UK
https://summitlog.uk

────────────────────────────────────────
To update your reminder settings, visit your Account page.
To unsubscribe, turn off email reminders in Account → Notifications.
"""

            try:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@summitlog.uk"),
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✓ Sent to {user.email} — {count} {summit_word} on {target_date}"
                    )
                )
                sent += 1
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"  ✗ Failed for {user.email}: {exc}"))
                errors += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone — {sent} reminder{'s' if sent != 1 else ''} sent"
                + (f", {errors} error{'s' if errors != 1 else ''}" if errors else "")
            )
        )