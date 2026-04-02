from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from FC.models import ClearanceTimeline, Faculty, Notification


class Command(BaseCommand):
    help = "Send faculty deadline approaching notifications based on the active clearance timeline end date."

    def add_arguments(self, parser):
        parser.add_argument(
            "--weekly",
            action="store_true",
            default=False,
            help="Send notification every Saturday while within the active clearance period.",
        )
        parser.add_argument(
            "--days",
            type=int,
            action="append",
            default=[7],
            help="Send notification when the clearance end date is N days away. Can be passed multiple times.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Compute what would be sent without writing notifications.",
        )

    def handle(self, *args, **options):
        weekly: bool = bool(options.get("weekly"))
        days_list: list[int] = list(options.get("days") or [])
        dry_run: bool = bool(options.get("dry_run"))

        days_list = sorted({int(d) for d in days_list if d is not None})
        if not weekly and not days_list:
            self.stdout.write(self.style.WARNING("No --days values provided; nothing to do."))
            return

        timeline = ClearanceTimeline.objects.filter(is_active=True, archive_date__isnull=True).order_by(
            "-academic_year_start", "-id"
        ).first()
        if not timeline or not timeline.clearance_end_date or not timeline.clearance_start_date:
            self.stdout.write(self.style.WARNING("No active clearance timeline found."))
            return

        today = timezone.localdate()
        end_date = timezone.localtime(timeline.clearance_end_date).date()
        start_date = timezone.localtime(timeline.clearance_start_date).date()

        days_left = (end_date - today).days

        should_send = False
        if weekly:
            # Saturday is 5 (Mon=0)
            is_saturday = today.weekday() == 5
            in_period = (today >= start_date) and (today <= end_date)
            should_send = bool(is_saturday and in_period)
        else:
            should_send = days_left in days_list

        if not should_send:
            self.stdout.write(
                self.style.SUCCESS(
                    f"No notification to send today. End date={end_date.isoformat()} days_left={days_left}."
                )
            )
            return

        faculty_user_ids = list(
            Faculty.objects.select_related("user").order_by("user_id").values_list("user_id", flat=True)
        )
        if not faculty_user_ids:
            self.stdout.write(self.style.WARNING("No faculty users found."))
            return

        title = "Deadline Approaching"
        body = (
            f"The clearance period is coming to end in {days_left} day(s). "
            "Ensure to submit your requirements on time to maintain timely submissions."
        )

        existing_user_ids = set(
            Notification.objects.filter(
                title=title,
                user_id__in=faculty_user_ids,
                clearance_period_end_date=end_date,
                created_at__date=today,
            ).values_list("user_id", flat=True)
        )

        to_create = []
        for user_id in faculty_user_ids:
            if user_id in existing_user_ids:
                continue
            to_create.append(
                Notification(
                    user_id=user_id,
                    user_role="Faculty",
                    title=title,
                    status=None,
                    body=body,
                    details=[],
                    is_read=False,
                    created_by=None,
                    approver=None,
                    clearance_period_start_date=start_date,
                    clearance_period_end_date=end_date,
                )
            )

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Dry-run: would create {len(to_create)} notifications."))
            return

        if not to_create:
            self.stdout.write(self.style.SUCCESS("No new notifications to create (already sent today)."))
            return

        with transaction.atomic():
            Notification.objects.bulk_create(to_create)

        self.stdout.write(self.style.SUCCESS(f"Created {len(to_create)} notifications."))
