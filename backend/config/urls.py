"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
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
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token

from inventory.views import CategoryViewSet, ProductViewSet
from sales.views import SaleViewSet
from accounts.views import CustomObtainAuthToken
# Create the router and register our viewsets
router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'sales', SaleViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Login endpoint - POST username/password → returns token
    # path('api/v1/auth/login/', obtain_auth_token, name='api_login'),
    path('api/v1/auth/login/', CustomObtainAuthToken.as_view(), name='api_login'),

    # All API endpoints (categories, products, sales)
    path('api/v1/', include(router.urls)),
]
