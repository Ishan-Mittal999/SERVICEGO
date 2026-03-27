import { apiUrl } from "@/lib/env";

export type PaymentGatewayMethod = "cod" | "upi" | "card" | "netbanking";

export type PaymentCustomer = {
  userId: string;
  name: string;
  phone: string;
};

export type CreateOrderInput = {
  method: PaymentGatewayMethod;
  amount: number;
  currency?: "INR";
  customer: PaymentCustomer;
  metadata?: Record<string, string>;
};

export type CreateOrderResult = {
  ok: boolean;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  signature?: string;
  metadata?: Record<string, string>;
  message?: string;
};

export type VerifyPaymentInput = {
  method: PaymentGatewayMethod;
  providerOrderId?: string;
  providerPaymentId?: string;
  signature?: string;
  metadata?: Record<string, string>;
};

export type VerifyPaymentResult = {
  verified: boolean;
  provider: string;
  message?: string;
};

type PaymentGatewayAdapter = {
  createOrder: (input: CreateOrderInput) => Promise<CreateOrderResult>;
  verifyPayment: (input: VerifyPaymentInput) => Promise<VerifyPaymentResult>;
};

const codAdapter: PaymentGatewayAdapter = {
  async createOrder(input) {
    return {
      ok: true,
      provider: "cod",
      providerOrderId: `cod-${Date.now()}`,
      metadata: {
        ...(input.metadata || {}),
        amount: String(input.amount),
      },
    };
  },
  async verifyPayment() {
    return {
      verified: true,
      provider: "cod",
      message: "Cash on Delivery selected.",
    };
  },
};

const gatewayStubAdapter: PaymentGatewayAdapter = {
  async createOrder(input) {
    // Ready for backend integration (e.g. Razorpay/Stripe create order endpoint).
    const response = await fetch(apiUrl("/payments/create-order"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return {
        ok: false,
        provider: "gateway",
        message: "Online payment gateway is not configured yet.",
      };
    }

    const data = await response.json();
    return {
      ok: Boolean(data?.ok),
      provider: String(data?.provider || "gateway"),
      providerOrderId: data?.providerOrderId,
      providerPaymentId: data?.providerPaymentId,
      signature: data?.signature,
      metadata: data?.metadata,
      message: data?.message,
    };
  },

  async verifyPayment(input) {
    // Ready for backend integration (signature verification endpoint).
    const response = await fetch(apiUrl("/payments/verify"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return {
        verified: false,
        provider: "gateway",
        message: "Online payment verification is not available yet.",
      };
    }

    const data = await response.json();
    return {
      verified: Boolean(data?.verified),
      provider: String(data?.provider || "gateway"),
      message: data?.message,
    };
  },
};

function resolveAdapter(method: PaymentGatewayMethod): PaymentGatewayAdapter {
  if (method === "cod") {
    return codAdapter;
  }

  return gatewayStubAdapter;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const adapter = resolveAdapter(input.method);
  return adapter.createOrder(input);
}

export async function verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  const adapter = resolveAdapter(input.method);
  return adapter.verifyPayment(input);
}
