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

type RazorpayOrderPayload = {
  keyId: string;
  providerOrderId: string;
  amount: number;
  currency: string;
};

type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    contact: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpaySuccessPayload) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type PaymentGatewayAdapter = {
  createOrder: (input: CreateOrderInput) => Promise<CreateOrderResult>;
  verifyPayment: (input: VerifyPaymentInput) => Promise<VerifyPaymentResult>;
};

const RAZORPAY_SCRIPT_ID = "servicego-razorpay-checkout-js";

function loadRazorpayScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise<boolean>((resolve) => {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function openRazorpayCheckout(
  orderPayload: RazorpayOrderPayload,
  input: CreateOrderInput
) {
  return new Promise<RazorpaySuccessPayload>((resolve, reject) => {
    if (typeof window === "undefined" || !window.Razorpay) {
      reject(new Error("Payment SDK not loaded"));
      return;
    }

    const razorpay = new window.Razorpay({
      key: orderPayload.keyId,
      amount: orderPayload.amount,
      currency: orderPayload.currency,
      name: "ServiceGo",
      description: "Service booking payment",
      order_id: orderPayload.providerOrderId,
      prefill: {
        name: input.customer.name,
        contact: input.customer.phone,
      },
      notes: {
        userId: input.customer.userId,
        method: input.method,
      },
      theme: {
        color: "#0ea5a4",
      },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment popup closed before completion")),
      },
    });

    razorpay.open();
  });
}

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
    const response = await fetch(apiUrl("/payments/create-order"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      let message = "Online payment gateway is not configured yet.";
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          message = String(errorData.message);
        }
      } catch {
        // Keep default message when response body is not JSON.
      }

      return {
        ok: false,
        provider: "gateway",
        message,
      };
    }

    const data = await response.json();

    if (!data?.ok) {
      return {
        ok: false,
        provider: String(data?.provider || "gateway"),
        message: String(data?.message || "Could not initialize payment."),
      };
    }

    if (input.method === "cod") {
      return {
        ok: true,
        provider: String(data?.provider || "cod"),
        providerOrderId: data?.providerOrderId,
        metadata: data?.metadata,
        message: data?.message,
      };
    }

    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded) {
      return {
        ok: false,
        provider: String(data?.provider || "gateway"),
        message: "Unable to load payment SDK. Please try again.",
      };
    }

    const checkoutResult = await openRazorpayCheckout(
      {
        keyId: String(data?.keyId || ""),
        providerOrderId: String(data?.providerOrderId || ""),
        amount: Number(data?.amount || 0),
        currency: String(data?.currency || "INR"),
      },
      input
    );

    return {
      ok: true,
      provider: String(data?.provider || "gateway"),
      providerOrderId: checkoutResult.razorpay_order_id,
      providerPaymentId: checkoutResult.razorpay_payment_id,
      signature: checkoutResult.razorpay_signature,
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
