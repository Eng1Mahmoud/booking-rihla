// All amounts are integer piastres. Only the booking service may choose them.
export interface AuthorizationInput {
  reference: string;
  amountPiastres: number;
  expiresAt: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}
export interface PaymentTransaction {
  id: string;
  orderId: string;
  integrationId: number;
  ownerId: number;
  amountPiastres: number;
  currency: string;
  pending: boolean;
  success: boolean;
  authorization: boolean;
  capture: boolean;
  voided: boolean;
  refunded: boolean;
  standalone: boolean;
  live: boolean;
  capturedPiastres: number;
}
// Transport operations only: payment services must persist intent/operation
// identifiers, enforce ownership and seat locks, and reconcile uncertain outcomes.
// Never expose these methods directly as public capture/void endpoints.
export interface PaymentProvider {
  createAuthorization(input: AuthorizationInput): Promise<{
    intentionId: string;
    orderId: string;
    checkoutUrl: string;
  }>;
  capture(transactionId: string, amountPiastres: number): Promise<void>;
  voidAuthorization(transactionId: string): Promise<void>;
  getTransaction(transactionId: string): Promise<PaymentTransaction>;
  getTransactionByReference(
    reference: string,
  ): Promise<PaymentTransaction & { reference: string }>;
}
// An uncertain POST must be reconciled by inquiry, never blindly repeated.
export class PaymentProviderError extends Error {
  readonly uncertain: boolean;
  constructor(uncertain = false) {
    super('Payment provider request could not be verified');
    this.name = 'PaymentProviderError';
    this.uncertain = uncertain;
  }
}
