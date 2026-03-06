export type Language = 'en' | 'hi' | 'ta' | 'te';

export interface Translations {
  common: {
    back: string;
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    ok: string;
    yes: string;
    no: string;
  };
  home: {
    title: string;
    subtitle: string;
    scanMessages: string;
    imageAnalysis: string;
    recentMessages: string;
    noMessages: string;
    grantPermissions: string;
    permissionsRequired: string;
    openSettings: string;
    language: string;
    selectLanguage: string;
  };
  imageUpload: {
    title: string;
    subtitle: string;
    uploadPlaceholder: string;
    uploadSubtext: string;
    supports: string;
    aiBadge: string;
    changeImage: string;
    analyze: string;
    analyzing: string;
    results: string;
    extractedText: string;
    classification: string;
    confidence: string;
    fraudType: string;
    explanation: string;
    viewDetails: string;
    newAnalysis: string;
    fraudDetection: string;
    fraudDetectionDesc: string;
    multiPlatform: string;
    multiPlatformDesc: string;
  };
  verdict: {
    title: string;
    safe: string;
    suspicious: string;
    highRisk: string;
    legitimate: string;
    fraudulent: string;
    riskLevel: string;
    confidence: string;
    explanation: string;
    evidence: string;
    recommendations: string;
    backToHome: string;
  };
  riskLevels: {
    safe: string;
    suspicious: string;
    highRisk: string;
  };
}
