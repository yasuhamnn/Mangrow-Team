/** @deprecated Import from ./admin/adminVerifyReportsBackend or ./admin/adminVerifyResolutionsBackend */
export {
  getPendingReports,
  submitReportVerificationDecision as submitAdminVerificationDecision,
} from './admin/adminVerifyReportsBackend'

export {
  getPendingResolutions as getResolutionReports,
  submitResolutionVerificationDecision,
} from './admin/adminVerifyResolutionsBackend'
