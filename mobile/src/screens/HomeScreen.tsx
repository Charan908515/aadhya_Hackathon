import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useSms } from "../data/SmsContext";
import { formatTime, SmsMessage } from "../data/sms";
import { useLanguage } from "../contexts/LanguageContext";
import { LanguageSelector } from "../components/LanguageSelector";
import { GmailService } from "../services/GmailService";
import { useFocusEffect } from "@react-navigation/native";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const verdictMeta = (level: SmsMessage["verdict"]["level"], t: any) => {
  if (level === "SPAM") {
    return { icon: "warning" as const, label: t.riskLevels.highRisk, color: "#EF4444" };
  }
  if (level === "SUSPICIOUS") {
    return { icon: "alert-circle" as const, label: t.riskLevels.suspicious, color: "#F59E0B" };
  }
  return { icon: "checkmark-circle" as const, label: t.riskLevels.safe, color: "#10B981" };
};

const snippet = (text: string) => {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > 64 ? `${trimmed.slice(0, 64)}...` : trimmed;
};

export default function HomeScreen({ navigation }: Props) {
  const { messages, note, permissionState, requestAccess, refreshInbox, loadingSms } = useSms();
  const { t } = useLanguage();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [gmailUser, setGmailUser] = useState<any>(null);
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);

  React.useEffect(() => {
    GmailService.configure();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const checkGmailStatus = async () => {
        const auth = await GmailService.getSignedInUser();
        if (auth && auth.user) {
          setGmailUser(auth.user);
          setGmailAccessToken(auth.accessToken);
        } else {
          setGmailUser(null);
          setGmailAccessToken(null);
        }
      };
      checkGmailStatus();
    }, [])
  );

  const handleGmailScanPress = async () => {
    // Check current status right before pressing to ensure we have the latest
    const auth = await GmailService.getSignedInUser();
    if (auth && auth.accessToken) {
      navigation.navigate("GmailScan", { accessToken: auth.accessToken, userFullName: auth.user?.name || undefined, userEmail: auth.user?.email || undefined });
    } else {
      navigation.navigate("GmailSignIn");
    }
  };

  const recentScans = messages.slice(0, 6);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>{t.home.title}</Text>
          <Text style={styles.headerSubtitle}>{t.home.subtitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguageSelector(true)}
        >
          <Ionicons name="globe-outline" size={20} color="#6366F1" />
          <Text style={styles.languageButtonText}>{t.home.language}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.callFab}
          activeOpacity={0.9}
          onPress={() => Linking.openURL('tel:1930')}
        >
          <Ionicons name="call-outline" size={20} color="#FFFFFF" />
          <Text style={styles.callFabText}>Report Cyber Fraud (Call 1930)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadFab}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("ImageUpload")}
        >
          <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
          <Text style={styles.uploadFabText}>{t.home.imageAnalysis}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gmailFab}
          activeOpacity={0.9}
          onPress={handleGmailScanPress}
        >
          <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
          <Text style={styles.gmailFabText}>Scan Gmail for Scams</Text>
        </TouchableOpacity>

        <View style={styles.accessCard}>
          <View style={styles.accessRow}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#111827" />
            <View style={{ flex: 1 }}>
              <Text style={styles.accessTitle}>Scan your inbox</Text>
              <Text style={styles.accessNote}>{note}</Text>
            </View>
            {permissionState === "granted" && (
              <TouchableOpacity
                onPress={refreshInbox}
                activeOpacity={0.7}
                style={{ padding: 4, opacity: loadingSms ? 0.5 : 1 }}
                disabled={loadingSms}
              >
                <Ionicons name="refresh" size={22} color="#111827" />
              </TouchableOpacity>
            )}
          </View>
          {permissionState !== "granted" && (
            <TouchableOpacity
              style={styles.accessButton}
              activeOpacity={0.9}
              onPress={requestAccess}
            >
              <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
              <Text style={styles.accessButtonText}>{t.home.grantPermissions}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t.home.recentMessages}</Text>

        {recentScans.map((item) => {
          const meta = verdictMeta(item.verdict.level, t);
          const initials = item.address?.slice(0, 1).toUpperCase() || "?";
          const cardContent = (
            <View style={styles.cardRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.messageBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.sender} numberOfLines={1}>
                    {item.address}
                  </Text>
                  <Text style={styles.cardTime}>{formatTime(item.date)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {snippet(item.body)}
                  </Text>
                  <View style={[styles.riskBadge, { backgroundColor: `${meta.color}22` }]}>
                    <Ionicons name={meta.icon} size={14} color={meta.color} />
                  </View>
                </View>
              </View>
            </View>
          );

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Verdict", { messageId: item.id })}
            >
              {cardContent}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
      />
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
    paddingBottom: 32,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#475569",
    marginTop: 4,
  },
  callFab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    minHeight: 56,
    gap: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  callFabText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  uploadFab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    minHeight: 56,
    gap: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  uploadFabText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  gmailFab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    minHeight: 56,
    gap: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  gmailFabText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  accessCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: 12,
  },
  accessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accessTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  accessNote: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  accessButton: {
    minHeight: 56,
    backgroundColor: "#111827",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  accessButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
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
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  messageBody: {
    flex: 1,
    gap: 6,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
  },
  cardTime: {
    fontSize: 12,
    color: "#64748B",
  },
  sender: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  riskBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    gap: 6,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6366F1",
  },
});
