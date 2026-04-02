from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("FC", "0002_add_clearance_timeline_to_approver_flow_config"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="clearance",
            index=models.Index(fields=["academic_year", "term"], name="FC_clearanc_academi_7f9c77_idx"),
        ),
        migrations.AddIndex(
            model_name="clearance",
            index=models.Index(fields=["faculty", "academic_year", "term"], name="FC_clearanc_faculty_f42c13_idx"),
        ),
        migrations.AddIndex(
            model_name="clearancetimeline",
            index=models.Index(fields=["is_active"], name="FC_clearanc_is_acti_ae2d65_idx"),
        ),
        migrations.AddIndex(
            model_name="clearancetimeline",
            index=models.Index(fields=["academic_year_start", "id"], name="FC_clearanc_academi_4d3f82_idx"),
        ),
        migrations.AddIndex(
            model_name="clearancetimeline",
            index=models.Index(fields=["term"], name="FC_clearanc_term_9f7df6_idx"),
        ),
        migrations.AddIndex(
            model_name="clearancerequest",
            index=models.Index(fields=["clearance_timeline"], name="FC_clearanc_clearan_7dff0a_idx"),
        ),
        migrations.AddIndex(
            model_name="clearancerequest",
            index=models.Index(fields=["status"], name="FC_clearanc_status_5c4b44_idx"),
        ),
    ]
