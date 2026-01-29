from django.db import models
from core.models import TimeStampedModel
from users.models import User

class Post(TimeStampedModel):
    project_id = models.CharField(max_length=16)
    title = models.CharField(max_length=256)
    content = models.TextField()
    created_by = models.ForeignKey(
        User,
        related_name='user',
        on_delete=models.CASCADE)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

