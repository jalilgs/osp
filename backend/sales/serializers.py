from rest_framework import serializers
from .models import Sale, SaleItem
from inventory.models import Product
from inventory.serializers import ProductSerializer

class SaleItemSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = SaleItem
        fields = ('id', 'product', 'product_detail', 'qty', 'unit_price')

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    username = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = ('id', 'user', 'timestamp', 'total', 'items', 'username')
        read_only_fields = ('user', 'timestamp', 'total')

    def get_username(self, obj):
        return obj.user.username
