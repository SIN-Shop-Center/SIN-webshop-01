export type CheckoutItem = {
  sku: string;
  title: string;
  variant: string;
  unit_price_amount: number;
  quantity: number;
  image_url?: string | null;
};

export type ShippingAddress = {
  first_name: string;
  last_name: string;
  street1: string;
  street2?: string | null;
  city: string;
  zip: string;
  country: string;
  phone?: string | null;
};

export type CheckoutCreateRequest = {
  email: string;
  currency?: string;
  shipping_method?: string;
  shipping_address: ShippingAddress;
  items: CheckoutItem[];
};
