import { sampleProducts } from '@/data/sample-products'
import type { AccountData } from '@/features/account/types'
import type { Address, Order } from '@/types'

const sampleAddresses: Address[] = [
  {
    id: 'address-home',
    name: 'Zuhause',
    street: 'Musterstraße 123',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Deutschland',
    phone: '+49 30 12345678',
    isDefault: true,
  },
  {
    id: 'address-office',
    name: 'Büro',
    street: 'Businessallee 456',
    city: 'München',
    postalCode: '80331',
    country: 'Deutschland',
    phone: '+49 89 87654321',
    isDefault: false,
  },
]

const sampleOrders: Order[] = [
  {
    id: 'ORD-001',
    customerId: 'demo-user',
    items: [
      {
        id: 'line-1',
        productId: 'prod-1',
        productName: 'Wireless Bluetooth Kopfhörer Pro',
        productImage: '/catalog/electronics.svg',
        quantity: 1,
        price: 79.99,
      },
      {
        id: 'line-2',
        productId: 'prod-7',
        productName: 'Kabellose Ladestation 3-in-1',
        productImage: '/catalog/electronics.svg',
        quantity: 2,
        price: 44.99,
      },
    ],
    status: 'delivered',
    subtotal: 169.97,
    shipping: 4.99,
    tax: 33.24,
    total: 208.2,
    shippingAddress: sampleAddresses[0],
    billingAddress: sampleAddresses[0],
    paymentMethod: 'stripe',
    paymentStatus: 'paid',
    trackingNumber: 'DHL-1234567890',
    createdAt: '2026-01-20T10:30:00Z',
    updatedAt: '2026-01-23T14:00:00Z',
  },
  {
    id: 'ORD-002',
    customerId: 'demo-user',
    items: [
      {
        id: 'line-3',
        productId: 'prod-2',
        productName: 'Smartwatch Fitness Tracker',
        productImage: '/catalog/electronics.svg',
        quantity: 1,
        price: 149.99,
      },
    ],
    status: 'shipped',
    subtotal: 149.99,
    shipping: 0,
    tax: 28.5,
    total: 178.49,
    shippingAddress: sampleAddresses[1],
    billingAddress: sampleAddresses[1],
    paymentMethod: 'paypal',
    paymentStatus: 'paid',
    trackingNumber: 'DPD-9876543210',
    createdAt: '2026-01-25T15:45:00Z',
    updatedAt: '2026-01-26T09:00:00Z',
  },
]

const sampleWishlist = sampleProducts.slice(0, 4)

const fallbackUser = {
  id: 'demo-user',
  name: 'Max Mustermann',
  email: 'max@example.com',
  phone: '+49 30 12345678',
  addresses: sampleAddresses,
  createdAt: '2025-06-15T00:00:00Z',
}

export const fallbackAccountData: AccountData = {
  displayUser: fallbackUser,
  orders: sampleOrders,
  wishlist: sampleWishlist,
  addresses: sampleAddresses,
}
