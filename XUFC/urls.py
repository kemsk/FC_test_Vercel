"""
URL configuration for XUFC project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include
from FC import views as fc_views
from django.shortcuts import redirect
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'healthy', 'message': 'XUFC Django App is running'})

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('', lambda request: redirect('admin/xu-faculty-clearance/dashboard/'), name='root'),
    path('admin/xu-faculty-clearance/', include('FC.urls')),
    path('accounts/login/google/', fc_views.google_oauth_start, name='google_oauth_start'),
    path('accounts/login/google/callback/', fc_views.google_oauth_callback, name='google_oauth_callback'),
]

