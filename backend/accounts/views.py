from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

from django.contrib.auth.models import User, Group
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .serializers import UserSerializer  # à créer

class CustomObtainAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)

        # Récupérer le premier groupe (rôle)
        groups = user.groups.all()
        role = groups[0].name if groups.exists() else 'Cashier'

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'role': role,
        })

        
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Seul l'admin peut créer/modifier/supprimer
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def set_role(self, request, pk=None):
        user = self.get_object()
        role = request.data.get('role')
        if role not in ['Admin', 'Manager', 'Cashier']:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        group, _ = Group.objects.get_or_create(name=role)
        user.groups.clear()
        user.groups.add(group)
        return Response({'status': 'Role updated'})
