from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, CurrentUserView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('auth/me/', CurrentUserView.as_view(), name='auth_me'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
