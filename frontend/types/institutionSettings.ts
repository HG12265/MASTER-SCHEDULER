export interface InstitutionSettings {
  id?: string;
  institutionName: string;
  departmentName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  academicTitle?: string | null;
  logoUrl?: string | null;
  logoPath?: string | null;
  principalName?: string | null;
  hodName?: string | null;
  preparedByLabel?: string | null;
  approvedByLabel?: string | null;
  footerText?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface InstitutionSettingsUpdate {
  institutionName?: string;
  departmentName?: string;
  addressLine1?: string;
  addressLine2?: string;
  academicTitle?: string;
  logoUrl?: string;
  logoPath?: string;
  principalName?: string;
  hodName?: string;
  preparedByLabel?: string;
  approvedByLabel?: string;
  footerText?: string;
}
