import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, typography } from "./src/theme";

declare const require: (moduleName: string) => unknown;

type VerdictLevel = "SAFE" | "SUSPICIOUS" | "SPAM";

type SpamVerdict = {
  level: VerdictLevel;
  score: number;
  fraudType: string;
  explanation: string;
  suspiciousKeywords: string[];
};

type SmsMessage = {
  id: string;
  address: string;
  body: string;
  date: number;
  verdict: SpamVerdict;
};

type PermissionState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

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

const liteModel = require("./src/model/lite_model.json") as LiteModel;
const TOKEN_RE = /[a-z0-9]+/g;

const smsReceiverModule = Platform.OS === "android" ? NativeModules.SmsReceiver : null;
const smsEventEmitter =
  Platform.OS === "android" && smsReceiverModule
    ? new NativeEventEmitter(smsReceiverModule)
    : null;

const demoMessages: SmsMessage[] = [
  {
    id: "d-1",
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
    id: "d-2",
    address: "VM-ALERT",
    body: "Urgent KYC pending. Click http://fake-link.in to avoid account block.",
    date: Date.now() - 1000 * 60 * 53,
    verdict: {
      level: "SPAM",
      score: 92,
      fraudType: "KYC/Account Takeover Scam",
      explanation: "Contains urgent language and a suspicious link to force quick action.",
      suspiciousKeywords: ["urgent", "kyc", "click", "link"],
    },
  },
  {
    id: "d-3",
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

function formatTime(timestamp: number): string {
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

function localAnalyzeMessage(message: string): SpamVerdict {
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

async function readInboxSms(): Promise<SmsMessage[]> {
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

export default function App() {
  const [permissionState, setPermissionState] = useState<PermissionState>("idle");
  const [loadingSms, setLoadingSms] = useState(false);
  const [messages, setMessages] = useState<SmsMessage[]>(demoMessages);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [note, setNote] = useState("Grant SMS permission to scan your inbox for fraud.");

  const selectedMessage = useMemo(
    () => messages.find((item) => item.id === selectedMessageId) ?? null,
    [messages, selectedMessageId]
  );

  useEffect(() => {
    if (!smsEventEmitter) {
      return;
    }

    const subscription = smsEventEmitter.addListener("smsReceived", (payload) => {
      const body = typeof payload?.body === "string" ? payload.body : "";
      const address = typeof payload?.address === "string" ? payload.address : "Unknown Sender";
      const timestamp =
        typeof payload?.timestamp === "number" && Number.isFinite(payload.timestamp)
          ? payload.timestamp
          : Date.now();

      if (!body.trim()) {
        return;
      }

      const verdict = localAnalyzeMessage(body);
      const newMessage: SmsMessage = {
        id: `${timestamp}-${address}`.replace(/\s+/g, "_"),
        address,
        body: body.trim(),
        date: timestamp,
        verdict,
      };

      setMessages((prev) => {
        if (prev.some((item) => item.id === newMessage.id)) {
          return prev;
        }
        return [newMessage, ...prev];
      });
    });

    return () => subscription.remove();
  }, []);

  const requestSmsPermission = async () => {
    if (Platform.OS !== "android") {
      setPermissionState("unavailable");
      setNote("SMS inbox reading is available only on Android.");
      return;
    }

    try {
      setPermissionState("requesting");
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
        setPermissionState("denied");
        setNote("Permission denied. Set Fraud Shield as default SMS app and allow SMS permissions.");
        return;
      }

      setPermissionState("granted");
      setNote("Permission granted. Loading SMS inbox...");
      await loadInbox();
    } catch {
      setPermissionState("unavailable");
      setNote(
        "SMS access is not available in Expo Go. Use a development build for real inbox reading."
      );
    }
  };

  const loadInbox = async () => {
    if (Platform.OS !== "android") {
      return;
    }

    setLoadingSms(true);
    try {
      const inbox = await readInboxSms();
      if (inbox.length === 0) {
        setMessages(demoMessages);
        setNote("No SMS found. Showing demo messages.");
      } else {
        setMessages(inbox);
        setNote(`Loaded ${inbox.length} messages from inbox.`);
      }
    } catch {
      setPermissionState("unavailable");
      setMessages(demoMessages);
      setNote("Inbox reading is unavailable in Expo Go. Showing demo messages instead.");
    } finally {
      setLoadingSms(false);
    }
  };

  const verdictTone = (level: VerdictLevel) => {
    if (level === "SPAM") {
      return { color: colors.danger, label: "SPAM", icon: "!" };
    }
    if (level === "SUSPICIOUS") {
      return { color: colors.warning, label: "SUSPICIOUS", icon: "?" };
    }
    return { color: colors.safe, label: "SAFE", icon: "ok" };
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[colors.bgDeep, colors.bgMid]} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Fraud Shield Messages</Text>
          <Text style={styles.subtitle}>Messages app with built-in fraud detection</Text>
          <Text style={styles.note}>{note}</Text>

          <View style={styles.actionsRow}>
            <Pressable style={styles.primaryBtn} onPress={requestSmsPermission}>
              <Text style={styles.primaryBtnText}>Allow SMS Access</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => smsReceiverModule?.requestDefaultSmsRole?.()}
            >
              <Text style={styles.secondaryBtnText}>Set Default SMS</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={loadInbox}
              disabled={permissionState !== "granted"}
            >
              <Text style={styles.secondaryBtnText}>Refresh Inbox</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.listCard}>
            <Text style={styles.sectionTitle}>Inbox</Text>
            {loadingSms && (
              <View style={styles.loaderRow}>
                <ActivityIndicator color={colors.accentBlue} />
                <Text style={styles.loaderText}>Reading SMS...</Text>
              </View>
            )}

            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const tone = verdictTone(item.verdict.level);
                const selected = selectedMessageId === item.id;
                return (
                  <Pressable
                    style={[styles.messageRow, selected && styles.messageRowActive]}
                    onPress={() => setSelectedMessageId(item.id)}
                  >
                    <View style={[styles.iconBadge, { borderColor: tone.color }]}>
                      <Text style={[styles.iconText, { color: tone.color }]}>{tone.icon}</Text>
                    </View>
                    <View style={styles.messageMain}>
                      <View style={styles.rowTop}>
                        <Text style={styles.sender} numberOfLines={1}>
                          {item.address}
                        </Text>
                        <Text style={styles.timeText}>{formatTime(item.date)}</Text>
                      </View>
                      <Text style={styles.preview} numberOfLines={2}>
                        {item.body}
                      </Text>
                    </View>
                    <View style={[styles.levelPill, { borderColor: tone.color }]}>
                      <Text style={[styles.levelPillText, { color: tone.color }]}>{tone.label}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Message Detail</Text>
            {!selectedMessage ? (
              <Text style={styles.emptyText}>Open a message to view fraud verdict details.</Text>
            ) : (
              <View style={styles.detailBody}>
                <Text style={styles.detailSender}>{selectedMessage.address}</Text>
                <Text style={styles.detailDate}>{formatTime(selectedMessage.date)}</Text>
                <Text style={styles.detailText}>{selectedMessage.body}</Text>

                <View style={styles.resultBox}>
                  <Text style={styles.resultTitle}>
                    Verdict: {verdictTone(selectedMessage.verdict.level).label} (
                    {selectedMessage.verdict.score}% risk)
                  </Text>
                  <Text style={styles.resultType}>{selectedMessage.verdict.fraudType}</Text>
                  <Text style={styles.resultExplain}>{selectedMessage.verdict.explanation}</Text>
                  <Text style={styles.keywords}>
                    Keywords:{" "}
                    {selectedMessage.verdict.suspiciousKeywords.length > 0
                      ? selectedMessage.verdict.suspiciousKeywords.join(", ")
                      : "none"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  container: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  note: {
    color: colors.accentBlue,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  actionsRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.accentBlue,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.small,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.small,
  },
  content: {
    flex: 1,
    gap: spacing.md,
  },
  listCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  detailCard: {
    flex: 1,
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.h3,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  loaderText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  messageRowActive: {
    backgroundColor: "rgba(90, 169, 255, 0.08)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontWeight: "800",
    fontSize: typography.small,
  },
  messageMain: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  sender: {
    color: colors.textPrimary,
    fontWeight: "700",
    flex: 1,
  },
  timeText: {
    color: colors.textDim,
    fontSize: 11,
  },
  preview: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  levelPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  detailBody: {
    gap: spacing.sm,
  },
  detailSender: {
    color: colors.textPrimary,
    fontSize: typography.h3,
    fontWeight: "700",
  },
  detailDate: {
    color: colors.textDim,
    fontSize: typography.small,
  },
  detailText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  resultBox: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    gap: spacing.xs,
  },
  resultTitle: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: typography.body,
  },
  resultType: {
    color: colors.accentAmber,
    fontWeight: "700",
    fontSize: typography.small,
  },
  resultExplain: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 18,
  },
  keywords: {
    color: colors.accentBlue,
    fontSize: typography.small,
  },
});
