from django.urls import path
from .views import UserPermissionsView, UsersListView, AllFunctionsView

urlpatterns = [
    path('users/', UsersListView.as_view(), name='users_list'),
    path('users/<int:user_id>/permissions/', UserPermissionsView.as_view(), name='user_permissions'),
    path('permissions/functions/', AllFunctionsView.as_view(), name='all_functions'),
]
