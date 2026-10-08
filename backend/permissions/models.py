from django.db import models


class Function(models.Model):
    """
    Function entity representing a fine-grained capability/permission in the system.
    """
    name = models.CharField(
        max_length=150,
        help_text="Human-readable name of the function"
    )
    code = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique uppercase code identifying the function (e.g. CREATE_EMPLOYEE)"
    )
    description = models.TextField(
        help_text="Detailed description of what this function permits"
    )

    class Meta:
        verbose_name = 'Function'
        verbose_name_plural = 'Functions'
        db_table = 'functions'
        ordering = ['code']

    def clean(self):
        super().clean()
        if self.code:
            self.code = self.code.strip().upper()

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"
