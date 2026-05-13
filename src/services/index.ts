// Single import surface for the UI.
// Swap this to a real implementation later without touching components.
export {
  flowService, sessionService, otpService, messageService,
  executionService, dashboardService, templateService,
} from "./real";
export type * from "./contracts";
