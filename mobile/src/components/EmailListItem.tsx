import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GmailMessage } from "../services/GmailService";

export const verdictMeta = (level: string, t: any) => {
    if (level === "SPAM") {
        return { icon: "warning" as const, label: t?.riskLevels?.highRisk || "HIGH RISK", color: "#EF4444" };
    }
    if (level === "SUSPICIOUS") {
        return { icon: "alert-circle" as const, label: t?.riskLevels?.suspicious || "SUSPICIOUS", color: "#F59E0B" };
    }
    return { icon: "checkmark-circle" as const, label: t?.riskLevels?.safe || "SAFE", color: "#10B981" };
};

export function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

type Props = {
    email: GmailMessage;
    onPress: () => void;
    t: any;
};

export default function EmailListItem({ email, onPress, t }: Props) {
    const meta = verdictMeta(email.verdict.level, t);

    // Extract just the name from 'Name <email@domain.com>'
    const senderNameMatch = email.sender.match(/^([^<]+)/);
    const displaySender = senderNameMatch ? senderNameMatch[1].trim().replace(/['"]/g, '') : email.sender;
    const initials = displaySender.slice(0, 1).toUpperCase() || "?";

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={onPress}
        >
            <View style={styles.cardRow}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.messageBody}>
                    <View style={styles.rowTop}>
                        <Text style={styles.sender} numberOfLines={1}>
                            {displaySender}
                        </Text>
                        <Text style={styles.cardTime}>{formatTime(email.date)}</Text>
                    </View>

                    <Text style={styles.subject} numberOfLines={1}>
                        {email.subject}
                    </Text>

                    <View style={styles.rowBottom}>
                        <Text style={styles.snippetText} numberOfLines={1}>
                            {email.snippet}
                        </Text>
                        <View style={[styles.riskBadge, { backgroundColor: `${meta.color}22` }]}>
                            <Ionicons name={meta.icon} size={14} color={meta.color} />
                        </View>
                    </View>

                    {email.verdict.level !== 'SAFE' && (
                        <View style={[styles.fraudTypeBadge, { backgroundColor: `${meta.color}15`, borderColor: `${meta.color}40`, borderWidth: 1 }]}>
                            <Text style={[styles.fraudTypeText, { color: meta.color }]}>{email.verdict.fraudType}</Text>
                        </View>
                    )}

                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
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
        marginTop: 2,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0F172A",
    },
    messageBody: {
        flex: 1,
        gap: 4,
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
        marginTop: 2,
    },
    sender: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0F172A",
        flex: 1,
    },
    subject: {
        fontSize: 14,
        fontWeight: "600",
        color: "#334155",
    },
    snippetText: {
        fontSize: 13,
        color: "#64748B",
        flex: 1,
    },
    cardTime: {
        fontSize: 12,
        color: "#64748B",
    },
    riskBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    fraudTypeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
    },
    fraudTypeText: {
        fontSize: 10,
        fontWeight: '600',
    }
});
