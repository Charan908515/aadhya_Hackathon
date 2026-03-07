import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { GmailService, GmailMessage } from '../services/GmailService';
import EmailListItem from '../components/EmailListItem';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, "GmailScan">;

export default function GmailScanScreen({ navigation, route }: Props) {
    const { accessToken, userFullName, userEmail } = route.params;
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);

    const [emails, setEmails] = useState<GmailMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadEmails = async (isRefresh = false, isPolling = false) => {
        if (!accessToken) return;

        try {
            if (isRefresh && !isPolling) setRefreshing(true);
            else if (!isRefresh && !isPolling) setLoading(true);
            if (!isPolling) setError(null);

            const fetchedEmails = await GmailService.fetchRecentEmails(accessToken, 15);
            setEmails(fetchedEmails);
        } catch (err: any) {
            if (!isPolling) setError(err.message || 'Failed to fetch emails');
        } finally {
            if (isRefresh && !isPolling) setRefreshing(false);
            else if (!isRefresh && !isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        loadEmails();

        // Polling every 10 seconds to fetch new emails silently
        const intervalId = setInterval(() => {
            loadEmails(true, true);
        }, 10000);

        return () => clearInterval(intervalId);
    }, [accessToken]);

    const handleSignOut = async () => {
        await GmailService.signOut();
        navigation.replace('Home');
    };

    const fraudCount = emails.filter(e => e.verdict.level !== 'SAFE').length;

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.iconPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.gmail.headerTitle}</Text>
                <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                    <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
            </View>

            <View style={styles.userInfoCard}>
                <View style={styles.userInfoRow}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{userFullName?.charAt(0) || 'U'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{userFullName || 'Google User'}</Text>
                        <Text style={styles.userEmail}>{userEmail || t.gmail.signedIn}</Text>
                    </View>
                </View>

                {!loading && !error && (
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{emails.length}</Text>
                            <Text style={styles.statLabel}>{t.gmail.scanned}</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: fraudCount > 0 ? (isDark ? `${colors.danger}33` : '#FEF2F2') : colors.bgMid }]}>
                            <Text style={[styles.statValue, { color: fraudCount > 0 ? colors.danger : colors.textPrimary }]}>{fraudCount}</Text>
                            <Text style={[styles.statLabel, { color: fraudCount > 0 ? colors.danger : colors.textDim }]}>{t.gmail.suspicious}</Text>
                        </View>
                    </View>
                )}
            </View>

            {error ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="warning" size={48} color={colors.danger} style={{ marginBottom: 16 }} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => loadEmails()}>
                        <Text style={styles.retryButtonText}>{t.common.retry}</Text>
                    </TouchableOpacity>
                </View>
            ) : loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.safe} />
                    <Text style={styles.loadingText}>{t.gmail.scanning}</Text>
                </View>
            ) : (
                <FlatList
                    data={emails}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => loadEmails(true)} tintColor={colors.safe} />
                    }
                    renderItem={({ item }) => (
                        <EmailListItem
                            email={item}
                            t={t}
                            onPress={() => {
                                // Navigate to VerdictScreen, passing the Gmail message as a generic SmsMessage
                                navigation.navigate("Verdict", {
                                    message: {
                                        id: item.id,
                                        address: item.sender,
                                        body: item.subject + "\n\n" + item.snippet,
                                        date: item.date,
                                        verdict: item.verdict
                                    }
                                });
                            }}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="mail-open-outline" size={48} color={colors.textDim} style={{ marginBottom: 12 }} />
                            <Text style={styles.emptyText}>{t.gmail.noEmails}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 50, // Add top padding to avoid notification bar overlap
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
        backgroundColor: colors.bgCard,
        borderRadius: 20,
        shadowColor: colors.cardShadow,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    signOutButton: {
        padding: 8,
        backgroundColor: isDark ? `${colors.danger}22` : '#FEF2F2',
        borderRadius: 20,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textMuted,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 16,
        color: colors.danger,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: colors.safe,
        borderRadius: 12,
    },
    retryButtonText: {
        color: colors.iconInvert,
        fontSize: 16,
        fontWeight: '600',
    },
    userInfoCard: {
        backgroundColor: colors.bgCard,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: colors.cardShadow,
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.safe,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    userEmail: {
        fontSize: 14,
        color: colors.textDim,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: colors.bgMid,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textDim,
        marginTop: 2,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textDim,
    }
});
