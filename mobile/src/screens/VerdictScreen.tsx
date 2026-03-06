import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useSms } from "../data/SmsContext";
import { SmsMessage } from "../data/sms";
import { useLanguage } from "../contexts/LanguageContext";

type Props = NativeStackScreenProps<RootStackParamList, "Verdict">;

const mockMessageText =
  "Dear User, your electricity bill is unpaid. Connection will be cut tonight. Call 9876543210 to update KYC.";

const RedFlagText = () => (
  <Text style={styles.messageText}>
    Dear User, your electricity bill is <Text style={styles.redFlag}>unpaid</Text>. Connection will be{" "}
    <Text style={styles.redFlag}>cut tonight</Text>. Call 9876543210 to{" "}
    <Text style={styles.redFlag}>update KYC</Text>.
  </Text>
);

const verdictMeta = (message: SmsMessage | null, t: any) => {
  if (!message) {
    return { icon: "warning" as const, label: t.verdict.highRisk, color: "#EF4444", score: 92 };
  }
  const level = message.verdict.level;
  if (level === "SPAM") {
    return { icon: "warning" as const, label: t.verdict.highRisk, color: "#EF4444", score: message.verdict.score };
  }
  if (level === "SUSPICIOUS") {
    return { icon: "alert-circle" as const, label: t.verdict.suspicious, color: "#F59E0B", score: message.verdict.score };
  }
  return { icon: "checkmark-circle" as const, label: t.verdict.safe, color: "#10B981", score: message.verdict.score };
};

export default function VerdictScreen({ navigation, route }: Props) {
  const { getMessageById } = useSms();
  const { t } = useLanguage();

  // Either use the passed message object (from Gmail), fetch it by ID (from SMS), or use the image analysis result
  let message: SmsMessage | null = route.params?.message || getMessageById(route.params?.messageId);
  const analysisResult = route.params?.analysisResult;

  if (analysisResult && !message) {
    message = {
      id: 'image-result',
      address: 'Image Analysis',
      date: Date.now(),
      body: analysisResult.text,
      verdict: {
        level: analysisResult.riskLevel,
        score: analysisResult.confidence,
        explanation: analysisResult.explanation,
        fraudType: analysisResult.fraudType || (analysisResult.isFraud ? "Other Scam" : "Likely Legitimate"),
        suspiciousKeywords: []
      }
    };
  }

  const meta = verdictMeta(message, t);
  const keywords = message?.verdict.suspiciousKeywords ?? [];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
            <Text style={styles.backText}>{t.common.back}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.verdict.title}</Text>
        </View>

        <View style={styles.threadHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{message?.address?.slice(0, 1).toUpperCase() || "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sender}>{message?.address ?? "Unknown Sender"}</Text>
            <Text style={styles.timeText}>{message ? "Just now" : "Today"}</Text>
          </View>
          <View style={[styles.riskPill, { borderColor: meta.color }]}>
            <Ionicons name={meta.icon} size={14} color={meta.color} />
            <Text style={[styles.riskPillText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.messageBubble}>
          {message?.body === mockMessageText || !message ? (
            <RedFlagText />
          ) : (
            <Text style={styles.messageText}>{message.body}</Text>
          )}
        </View>

        <View style={styles.predictionCard}>
          <View style={styles.predictionRow}>
            <View style={[styles.predictionIcon, { backgroundColor: `${meta.color}22` }]}>
              <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.predictionTitle}>{t.verdict.riskLevel}</Text>
              <Text style={styles.predictionLabel} numberOfLines={1}>
                {meta.label} · {meta.score}% risk
              </Text>
              {message?.verdict.fraudType && (
                <Text style={styles.fraudTypeText}>
                  Type: {t.fraudTypes[message.verdict.fraudType] || message.verdict.fraudType}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.predictionExplain}>
            {message?.verdict.explanation
              ? (t.explanations[message.verdict.explanation] || message.verdict.explanation)
              : t.explanations["This message matches common scam patterns and urgent language."]}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t.verdict.evidence}</Text>

        <View style={styles.explainRow}>
          <Ionicons name="time-outline" size={24} color="#EF4444" />
          <Text style={styles.explainText}>
            {t.evidenceTypes.urgency}
          </Text>
        </View>

        <View style={styles.explainRow}>
          <Ionicons name="call-outline" size={24} color="#EF4444" />
          <Text style={styles.explainText}>
            {t.evidenceTypes.personalNumber}
          </Text>
        </View>

        <View style={styles.keywordsCard}>
          <Text style={styles.keywordsTitle}>{t.verdict.evidence}</Text>
          <View style={styles.keywordRow}>
            {keywords.length === 0 ? (
              <Text style={styles.keywordEmpty}>{t.evidenceTypes.noStrongRedFlags}</Text>
            ) : (
              keywords.map((word) => (
                <View key={word} style={styles.keywordChip}>
                  <Text style={styles.keywordText}>{word}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  backText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  threadHeader: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  sender: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  timeText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  riskPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  riskPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  messageBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    color: "#111827",
    lineHeight: 24,
  },
  redFlag: {
    backgroundColor: "#FEE2E2",
    color: "#EF4444",
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
    marginBottom: 10,
  },
  predictionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: 10,
  },
  predictionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  predictionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  predictionTitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  predictionLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  fraudTypeText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    marginTop: 4,
  },
  predictionExplain: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
  },
  explainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  explainText: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
    lineHeight: 22,
  },
  keywordsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  keywordsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  keywordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  keywordChip: {
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  keywordText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 12,
  },
  keywordEmpty: {
    fontSize: 14,
    color: "#64748B",
  },
});
