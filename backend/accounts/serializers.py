from django.contrib.auth.models import User
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'role')
        read_only_fields = ('id',)

    def get_role(self, obj):
        groups = obj.groups.all()
        return groups[0].name if groups.exists() else 'Cashier'
