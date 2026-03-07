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
import { useTheme } from "../contexts/ThemeContext";
import { ThemeColors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Verdict">;

const mockMessageText =
  "Dear User, your electricity bill is unpaid. Connection will be cut tonight. Call 9876543210 to update KYC.";

const RedFlagText = ({ styles }: { styles: any }) => (
  <Text style={styles.messageText}>
    Dear User, your electricity bill is <Text style={styles.redFlag}>unpaid</Text>. Connection will be{" "}
    <Text style={styles.redFlag}>cut tonight</Text>. Call 9876543210 to{" "}
    <Text style={styles.redFlag}>update KYC</Text>.
  </Text>
);

const verdictMeta = (message: SmsMessage | null, t: any, colors: ThemeColors) => {
  if (!message) {
    return { icon: "warning" as const, label: t.verdict.highRisk, color: colors.danger, score: 92 };
  }
  const level = message.verdict.level;
  if (level === "SPAM") {
    return { icon: "warning" as const, label: t.verdict.highRisk, color: colors.danger, score: message.verdict.score };
  }
  if (level === "SUSPICIOUS") {
    return { icon: "alert-circle" as const, label: t.verdict.suspicious, color: colors.warning, score: message.verdict.score };
  }
  return { icon: "checkmark-circle" as const, label: t.verdict.safe, color: colors.safe, score: message.verdict.score };
};

export default function VerdictScreen({ navigation, route }: Props) {
  const { getMessageById } = useSms();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

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

  const meta = verdictMeta(message, t, colors);
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
            <Ionicons name="arrow-back" size={22} color={colors.iconPrimary} />
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
            <RedFlagText styles={styles} />
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
          <Ionicons name="time-outline" size={24} color={colors.danger} />
          <Text style={styles.explainText}>
            {t.evidenceTypes.urgency}
          </Text>
        </View>

        <View style={styles.explainRow}>
          <Ionicons name="call-outline" size={24} color={colors.danger} />
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

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50, // Add top padding to avoid notification bar overlap
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
    backgroundColor: colors.bgDeep,
    borderRadius: 16,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  backText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  threadHeader: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bgDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  sender: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 13,
    color: colors.textDim,
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
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  redFlag: {
    backgroundColor: isDark ? `${colors.danger}33` : '#FEE2E2',
    color: colors.danger,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 10,
  },
  predictionCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.cardShadow,
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
    color: colors.textDim,
    fontWeight: "600",
  },
  predictionLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 4,
  },
  fraudTypeText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: "600",
    marginTop: 4,
  },
  predictionExplain: {
    fontSize: 15,
    color: colors.textMuted,
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
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  keywordsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  keywordsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  keywordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  keywordChip: {
    backgroundColor: isDark ? `${colors.danger}33` : '#FEE2E2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  keywordText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 12,
  },
  keywordEmpty: {
    fontSize: 14,
    color: colors.textDim,
  },
});
