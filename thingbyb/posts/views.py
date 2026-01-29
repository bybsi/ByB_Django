from django.shortcuts import render
from .models import Post

def posts(request):
    NUM_COLS = 3
    posts = Post.objects.all()
    posts_grid = [[] for _ in range(0, NUM_COLS)]
    for idx, post in enumerate(posts):
        posts_grid[idx % 3].append(post)
    return render(
        request, 
        'templates/posts/content.html', 
        context={'posts_grid': posts_grid})
