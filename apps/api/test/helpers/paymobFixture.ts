import { createHmac } from 'node:crypto';
export const webhookEnvironment = {
  PAYMOB_WEBHOOK_ENABLED: 'true',
  PAYMOB_HMAC_SECRET: 'webhook_private_fixture',
  PAYMOB_INTEGRATION_ID: '6741',
  PAYMOB_OWNER_ID: '',
};
export const callbackFixture = {
  type: 'TRANSACTION',
  obj: {
    amount_cents: 100,
    created_at: '2020-03-25T18:39:44.719228',
    currency: 'EGP',
    error_occured: false,
    has_parent_transaction: false,
    id: 2556706,
    integration_id: 6741,
    is_3d_secure: true,
    is_auth: true,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: false,
    is_voided: false,
    order: { id: 4778239 },
    owner: 4705,
    pending: false,
    source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' },
    success: true,
  },
};
// Test-side signer. Production verification also has an independent documented vector.
export function signCallback(event: typeof callbackFixture) {
  const t = event.obj;
  return createHmac('sha512', webhookEnvironment.PAYMOB_HMAC_SECRET)
    .update(
      [
        t.amount_cents,
        t.created_at,
        t.currency,
        t.error_occured,
        t.has_parent_transaction,
        t.id,
        t.integration_id,
        t.is_3d_secure,
        t.is_auth,
        t.is_capture,
        t.is_refunded,
        t.is_standalone_payment,
        t.is_voided,
        t.order.id,
        t.owner,
        t.pending,
        t.source_data.pan,
        t.source_data.sub_type,
        t.source_data.type,
        t.success,
      ]
        .map(String)
        .join(''),
    )
    .digest('hex');
}
