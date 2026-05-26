// Compatibility layer: prefer importing provider diagnostics from providerRegistry in new code.
export {
  diagnoseProviderConfig,
  getWorstDiagnosticStatus,
  isValidHttpUrl,
  type ProviderDiagnosticCheck,
  type ProviderDiagnosticReport,
  type ProviderDiagnosticStatus,
} from './providerRegistry';
