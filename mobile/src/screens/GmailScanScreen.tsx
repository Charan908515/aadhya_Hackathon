import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { GmailService, GmailMessage } from '../services/GmailService';
import EmailListItem from '../components/EmailListItem';
import { useLanguage } from '../contexts/LanguageContext';

type Props = NativeStackScreenProps<RootStackParamList, "GmailScan">;

export default function GmailScanScreen({ navigation, route }: Props) {
    const { accessToken, userFullName, userEmail } = route.params;
    const { t } = useLanguage();

    const [emails, setEmails] = useState<GmailMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadEmails = async (isRefresh = false) => {
        if (!accessToken) return;

        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const fetchedEmails = await GmailService.fetchRecentEmails(accessToken, 15);
            setEmails(fetchedEmails);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch emails');
        } finally {
            if (isRefresh) setRefreshing(false);
            else setLoading(false);
        }
    };

    useEffect(() => {
        loadEmails();
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
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gmail Scan</Text>
                <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <View style={styles.userInfoCard}>
                <View style={styles.userInfoRow}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{userFullName?.charAt(0) || 'U'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{userFullName || 'Google User'}</Text>
                        <Text style={styles.userEmail}>{userEmail || 'Signed in'}</Text>
                    </View>
                </View>

                {!loading && !error && (
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{emails.length}</Text>
                            <Text style={styles.statLabel}>Scanned</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: fraudCount > 0 ? '#FEF2F2' : '#F8FAFC' }]}>
                            <Text style={[styles.statValue, { color: fraudCount > 0 ? '#EF4444' : '#0F172A' }]}>{fraudCount}</Text>
                            <Text style={[styles.statLabel, { color: fraudCount > 0 ? '#EF4444' : '#64748B' }]}>Suspicious</Text>
                        </View>
                    </View>
                )}
            </View>

            {error ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="warning" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => loadEmails()}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={styles.loadingText}>Scanning your inbox with local AI...</Text>
                </View>
            ) : (
                <FlatList
                    data={emails}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => loadEmails(true)} tintColor="#10B981" />
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
                            <Ionicons name="mail-open-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                            <Text style={styles.emptyText}>No recent emails found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F8FAFC',
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
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    signOutButton: {
        padding: 8,
        backgroundColor: '#FEF2F2',
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
        color: '#475569',
        fontWeight: '500',
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#10B981',
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    userInfoCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
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
        backgroundColor: '#10B981',
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
        color: '#0F172A',
    },
    userEmail: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
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
        color: '#64748B',
    }
});
