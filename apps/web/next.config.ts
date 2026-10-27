import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ['@booking-bus/ui'],
};
export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
