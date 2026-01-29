from django.db import models

class Activity(models.Model):
    ACTIVITIES = {
        'RN':'Running'
    }
    type = models.CharField(max_length=16, choices=ACTIVITIES, default='RN')
    title = models.CharField(max_length=64)
    date = models.DateTimeField()
    distance = models.DecimalField(max_digits=5, decimal_places=2)
    # Run duration
    time = models.TimeField()
    heart_rate = models.IntegerField()
    avg_pace = models.CharField(max_length=5)
    best_pace = models.CharField(max_length=5)
    ascent = models.IntegerField()
    descent = models.IntegerField()

    class Meta:
        ordering = ['-date']
        verbose_name_plural = 'Activities'

    def __str__(self):
        return f"{self.title}, {self.type}, {self.date}"

