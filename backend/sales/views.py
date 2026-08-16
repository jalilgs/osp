from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Sale, SaleItem
from .serializers import SaleSerializer
from inventory.models import Product

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all().prefetch_related('items__product')
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Only show sales made by the current user (or all for manager later)"""
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        data = request.data

        # ---- Gestion des deux structures possibles ----
        if isinstance(data.get('items'), dict) and 'items' in data['items']:
            # Cas : { items: { items: [...], customer_id: ... } }
            cart = data['items']['items']
            customer_id = data['items'].get('customer_id')
        else:
            # Cas normal : { items: [...], customer_id: ... }
            cart = data.get('items', [])
            customer_id = data.get('customer_id')

        if not cart:
            return Response(
                {'error': 'Cart is empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        total = 0
        sale = None

        try:
            with transaction.atomic():
                sale = Sale.objects.create(user=user, total=0)

                for item in cart:
                    product_id = item.get('product_id')
                    qty = item.get('qty', 0)

                    if not product_id or qty <= 0:
                        return Response(
                            {'error': f'Invalid product or quantity: {item}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    product = get_object_or_404(Product, pk=product_id)

                    if product.stock_qty < qty:
                        return Response(
                            {'error': f'Insufficient stock for {product.name}. Available: {product.stock_qty}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    product.stock_qty -= qty
                    product.save()

                    line_total = product.price * qty
                    total += line_total

                    SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        qty=qty,
                        unit_price=product.price
                    )

                sale.total = total
                sale.save()

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = self.get_serializer(sale)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
        print("request.data =", request.data)
        print("type =", type(request.data))
        cart = request.data.get('items', [])
        print("cart =", cart)
        cart = request.data.get('items', [])
        if not cart:
            return Response(
                {'error': 'Cart is empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        total = 0
        sale = None

        try:
            with transaction.atomic():
                sale = Sale.objects.create(user=user, total=0)

                for item in cart:
                    product_id = item.get('product_id')
                    qty = item.get('qty', 0)

                    if not product_id or qty <= 0:
                        return Response(
                            {'error': f'Invalid product or quantity: {item}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    product = get_object_or_404(Product, pk=product_id)

                    if product.stock_qty < qty:
                        return Response(
                            {'error': f'Insufficient stock for {product.name}. Available: {product.stock_qty}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    product.stock_qty -= qty
                    product.save()

                    line_total = product.price * qty
                    total += line_total

                    SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        qty=qty,
                        unit_price=product.price
                    )

                sale.total = total
                sale.save()

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = self.get_serializer(sale)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        """
        Expects: {"items": [{"product_id": 1, "qty": 2}, ...]}
        Creates the Sale, SaleItems, and decrements stock atomically.
        """
        cart = request.data.get('items', [])
        if not cart:
            return Response(
                {'error': 'Cart is empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        total = 0
        sale_items_data = []

        # Start an atomic transaction
        with transaction.atomic():
            # Create the sale (total will be updated after items)
            sale = Sale.objects.create(user=user, total=0)

            # Process each item in the cart
            for item in cart:
                product_id = item.get('product_id')
                qty = item.get('qty', 0)

                if not product_id or qty <= 0:
                    raise ValueError(f"Invalid product or quantity: {item}")

                product = get_object_or_404(Product, pk=product_id)

                # Check stock
                if product.stock_qty < qty:
                    raise ValueError(f"Insufficient stock for {product.name}")

                # Decrement stock
                product.stock_qty -= qty
                product.save()

                # Calculate line total
                line_total = product.price * qty
                total += line_total

                # Create the sale item
                SaleItem.objects.create(
                    sale=sale,
                    product=product,
                    qty=qty,
                    unit_price=product.price
                )

            # Update the sale total
            sale.total = total
            sale.save()

        # Return the serialized sale
        serializer = self.get_serializer(sale)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
