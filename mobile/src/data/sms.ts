import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from "react-native";

declare const require: (moduleName: string) => unknown;

export type VerdictLevel = "SAFE" | "SUSPICIOUS" | "SPAM";

export type SpamVerdict = {
  level: VerdictLevel;
  score: number;
  fraudType: string;
  explanation: string;
  suspiciousKeywords: string[];
};

export type SmsMessage = {
  id: string;
  address: string;
  body: string;
  date: number;
  verdict: SpamVerdict;
};

export type PermissionState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

type RawSmsMessage = {
  _id?: number | string;
  id?: number | string;
  address?: string;
  body?: string;
  date?: number | string;
};

type LiteModel = {
  vocabulary: Record<string, number>;
  idf: Record<string, number>;
  coef: Record<string, number>;
  intercept: number;
};

const liteModel = require("../model/lite_model.json") as LiteModel;
const TOKEN_RE = /[a-z0-9]+/g;

export const smsReceiverModule =
  Platform.OS === "android" ? NativeModules.SmsReceiver ?? null : null;

export const smsEventEmitter =
  Platform.OS === "android" && smsReceiverModule
    ? new NativeEventEmitter(smsReceiverModule)
    : null;

export const demoMessages: SmsMessage[] = [
  {
    id: "demo-1",
    address: "SBI-BANK",
    body: "Your account credited with salary Rs 24,500. No action needed.",
    date: Date.now() - 1000 * 60 * 31,
    verdict: {
      level: "SAFE",
      score: 8,
      fraudType: "Legitimate Transaction",
      explanation: "No scam patterns were detected in this SMS.",
      suspiciousKeywords: [],
    },
  },
  {
    id: "demo-2",
    address: "VM-ALERT",
    body: "Dear User, your electricity bill is unpaid. Connection will be cut tonight. Call 9876543210 to update KYC.",
    date: Date.now() - 1000 * 60 * 53,
    verdict: {
      level: "SPAM",
      score: 92,
      fraudType: "KYC/Account Takeover Scam",
      explanation: "Contains urgent language and a direct call-to-action to a personal number.",
      suspiciousKeywords: ["unpaid", "cut", "tonight", "update", "kyc"],
    },
  },
  {
    id: "demo-3",
    address: "JD-JOBS",
    body: "Pay 1999 registration fee for guaranteed job placement today.",
    date: Date.now() - 1000 * 60 * 210,
    verdict: {
      level: "SUSPICIOUS",
      score: 73,
      fraudType: "Advance Fee Scam",
      explanation: "Requests payment up front for a promise of guaranteed service.",
      suspiciousKeywords: ["pay", "fee", "guaranteed"],
    },
  },
];

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanText(text: string): string {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/http\S+|www\.\S+/g, " urltoken ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeText(text: string): string[] {
  const tokens = text.match(TOKEN_RE);
  return tokens ?? [];
}

function sigmoid(x: number): number {
  const clamped = Math.max(-30, Math.min(30, x));
  return 1 / (1 + Math.exp(-clamped));
}

function analyzeWithLiteModel(message: string): { probability: number; keywords: string[] } {
  const cleaned = cleanText(message);
  const tokens = tokenizeText(cleaned);
  if (tokens.length === 0) {
    return { probability: 0.0, keywords: [] };
  }

  const counts: Record<string, number> = {};
  for (const token of tokens) {
    counts[token] = (counts[token] ?? 0) + 1;
  }

  const docLen = tokens.length;
  let logit = liteModel.intercept ?? 0;
  const keywordScores: Array<{ token: string; score: number }> = [];

  for (const token of Object.keys(counts)) {
    const idf = liteModel.idf[token];
    const coef = liteModel.coef[token];
    if (idf === undefined || coef === undefined) {
      continue;
    }
    const tfidf = (counts[token] / docLen) * idf;
    const contrib = tfidf * coef;
    logit += contrib;
    if (coef > 0) {
      keywordScores.push({ token, score: contrib });
    }
  }

  const probability = sigmoid(logit);
  const keywords = keywordScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.token);

  return { probability, keywords };
}

export function localAnalyzeMessage(message: string): SpamVerdict {
  const { probability, keywords } = analyzeWithLiteModel(message);
  const score = Math.round(probability * 100);

  if (probability >= 0.7) {
    return {
      level: "SPAM",
      score,
      fraudType: "High Risk Scam",
      explanation: "On-device model detected strong scam-like language patterns.",
      suspiciousKeywords: keywords,
    };
  }

  if (probability >= 0.45) {
    return {
      level: "SUSPICIOUS",
      score,
      fraudType: "Suspicious Message",
      explanation: "On-device model detected multiple risky signals.",
      suspiciousKeywords: keywords,
    };
  }

  return {
    level: "SAFE",
    score,
    fraudType: "Likely Legitimate",
    explanation:
      keywords.length > 0
        ? "Few risky terms found, but overall low scam probability."
        : "On-device model found no risky patterns.",
    suspiciousKeywords: keywords,
  };
}

function toMessage(raw: RawSmsMessage, fallbackId: number): SmsMessage {
  const body = raw.body?.trim() || "(empty message)";
  const localVerdict = localAnalyzeMessage(body);
  const dateValue = Number(raw.date ?? Date.now());

  return {
    id: String(raw._id ?? raw.id ?? fallbackId),
    address: raw.address?.trim() || "Unknown Sender",
    body,
    date: Number.isFinite(dateValue) ? dateValue : Date.now(),
    verdict: localVerdict,
  };
}

export async function readInboxSms(): Promise<SmsMessage[]> {
  const smsModule = require("react-native-get-sms-android") as {
    default?: {
      list: (
        filter: string,
        failCallback: (error: string) => void,
        successCallback: (count: number, smsList: string) => void
      ) => void;
    };
    list?: (
      filter: string,
      failCallback: (error: string) => void,
      successCallback: (count: number, smsList: string) => void
    ) => void;
  };

  const reader = smsModule.default ?? smsModule;
  const listFn = reader.list;
  if (!listFn) {
    throw new Error("SMS reader not available");
  }

  const filter = {
    box: "inbox",
    maxCount: 80,
    indexFrom: 0,
  };

  return new Promise((resolve, reject) => {
    listFn(
      JSON.stringify(filter),
      (fail: string) => reject(new Error(fail)),
      (_count: number, smsList: string) => {
        try {
          const parsed = JSON.parse(smsList) as RawSmsMessage[];
          const messages = parsed
            .map((item, idx) => toMessage(item, idx))
            .sort((a, b) => b.date - a.date);
          resolve(messages);
        } catch {
          reject(new Error("Failed to parse inbox SMS"));
        }
      }
    );
  });
}

export async function requestSmsPermissions(): Promise<PermissionState> {
  if (Platform.OS !== "android") {
    return "unavailable";
  }

  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  ]);

  const readGranted = results[PermissionsAndroid.PERMISSIONS.READ_SMS];
  const receiveGranted = results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];

  if (
    readGranted !== PermissionsAndroid.RESULTS.GRANTED ||
    receiveGranted !== PermissionsAndroid.RESULTS.GRANTED
  ) {
    return "denied";
  }

  return "granted";
}
