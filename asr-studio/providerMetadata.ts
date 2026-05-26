// Compatibility layer: prefer importing provider metadata helpers from services/providerRegistry in new code.
export {
  asrProviderMenuOptions,
  asrProviderMetadata,
  asrProviderOrder,
  asrProviderSegmentOptions,
  getAsrProviderLabel,
  getProviderSummaryDetails,
  type ProviderMetadata,
} from './services/providerRegistry';
