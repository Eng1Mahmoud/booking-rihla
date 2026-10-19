// Explicit forwarding surface. Backend authorization still applies to every private operation.
const uuid = '[0-9a-fA-F-]{36}';
const routes = [
  {
    path: /^auth\/(login|register|verify-email|resend-verification|forgot-password|reset-password)$/,
    methods: ['POST'],
    public: true,
  },
  {
    path: /^auth\/(refresh|logout|logout-all)$/,
    methods: ['POST'],
    public: false,
  },
  { path: /^auth\/me$/, methods: ['GET'], public: false },
  {
    path: /^(cities|stations|routes|bus-types|amenities)(\/[0-9a-fA-F-]{36})?$/,
    methods: ['GET'],
    public: true,
  },
  {
    path: new RegExp('^trips/(search|' + uuid + '/(details|seats))$'),
    methods: ['GET'],
    public: true,
  },
  { path: /^payments\/availability$/, methods: ['GET'], public: true },
  { path: /^bookings$/, methods: ['GET', 'POST'], public: false },
  {
    path: new RegExp(
      '^bookings/' + uuid + '(/(payment|ticket|payment-attempt))?$',
    ),
    methods: ['GET'],
    public: false,
  },
  {
    path: new RegExp(
      '^bookings/' + uuid + '/(checkout|payment-attempt|payment/refresh)$',
    ),
    methods: ['POST'],
    public: false,
  },
  {
    path: new RegExp('^buses(/' + uuid + '(/seats)?)?$'),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    public: false,
  },
  {
    path: new RegExp('^trips(/' + uuid + ')?$'),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    public: false,
  },
  {
    path: /^(cities|stations|routes|bus-types|amenities)(\/[0-9a-fA-F-]{36})?$/,
    methods: ['POST', 'PATCH', 'PUT', 'DELETE'],
    public: false,
  },
];
export function apiRoute(path: string, method: string) {
  return routes.find(
    (route) => route.path.test(path) && route.methods.includes(method),
  );
}
