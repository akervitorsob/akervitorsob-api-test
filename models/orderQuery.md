MongoDB Order Query Structure

Order:
{
 customerId,
 sellerId,
 products,
 totalAmount,
 paymentStatus,
 orderStatus,
 riderId,
 deliveryStatus,
 createdAt
}

Admin:
- all orders

Seller:
- sellerId matched orders

Rider:
- assigned rider orders
