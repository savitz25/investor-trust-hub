import manifest from '../../../data/home/investor-network-metrics-v1.json';
import {
  INVESTOR_NETWORK_METRICS_VERSION,
  type InvestorNetworkMetricsV1,
} from './investor-network-metrics-v1';

export function loadInvestorNetworkMetrics(): InvestorNetworkMetricsV1 {
  const snap = manifest as InvestorNetworkMetricsV1;
  if (snap.schemaVersion !== INVESTOR_NETWORK_METRICS_VERSION) {
    throw new Error(`Unexpected network metrics version: ${snap.schemaVersion}`);
  }
  return snap;
}
