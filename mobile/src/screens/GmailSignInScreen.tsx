import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { GmailService } from '../services/GmailService';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, "GmailSignIn">;

export default function GmailSignInScreen({ navigation }: Props) {
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const styles = createStyles(colors, isDark);
    const [existingUser, setExistingUser] = useState<any>(null);

    useEffect(() => {
        GmailService.configure();
        checkExistingAuth();
    }, []);

    const checkExistingAuth = async () => {
        const auth = await GmailService.getSignedInUser();
        if (auth && auth.user) {
            setExistingUser(auth.user);
        } else {
            setExistingUser(null);
        }
    };

    const handleSignOut = async () => {
        await GmailService.signOut();
        setExistingUser(null);
    };

    const handleSignIn = async () => {
        try {
            const { accessToken, user } = await GmailService.signIn();
            if (accessToken) {
                // Navigate to the scan screen upon successful sign in
                navigation.replace('GmailScan', { accessToken, userFullName: user?.name, userEmail: user?.email });
            }
        } catch (error) {
            console.error("Sign-in error", error);
            // Handle error gracefully if needed
        }
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.iconPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.gmail.title}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="mail" size={64} color={colors.danger} />
                </View>
                <Text style={styles.title}>{t.gmail.scanTitle}</Text>
                <Text style={styles.subtitle}>
                    {t.gmail.scanSubtitle}
                </Text>

                <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                        <Ionicons name="shield-checkmark" size={24} color={colors.safe} />
                        <Text style={styles.featureText}>{t.gmail.feature1}</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="lock-closed" size={24} color={colors.safe} />
                        <Text style={styles.featureText}>{t.gmail.feature2}</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="eye-off" size={24} color={colors.safe} />
                        <Text style={styles.featureText}>{t.gmail.feature3}</Text>
                    </View>
                </View>

                {existingUser ? (
                    <View style={styles.existingUserContainer}>
                        <Text style={styles.existingUserText}>
                            {t.gmail.signedInAs} <Text style={{ fontWeight: 'bold' }}>{existingUser.email}</Text>
                        </Text>

                        <TouchableOpacity style={styles.signInButton} onPress={handleSignIn} activeOpacity={0.8}>
                            <Ionicons name="mail" size={20} color={colors.iconInvert} />
                            <Text style={styles.signInText}>{t.gmail.continueAndScan}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.switchAccountButton} onPress={handleSignOut} activeOpacity={0.8}>
                            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                            <Text style={styles.switchAccountText}>{t.gmail.signOutSwitch}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.signInButton} onPress={handleSignIn} activeOpacity={0.8}>
                        <Ionicons name="logo-google" size={20} color={colors.iconInvert} />
                        <Text style={styles.signInText}>{t.gmail.signInWithGoogle}</Text>
                    </TouchableOpacity>
                )}

            </View>
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
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: 60,
    },
    iconContainer: {
        width: 100,
        height: 100,
        backgroundColor: isDark ? `${colors.danger}22` : '#FEE2E2',
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    featureList: {
        width: '100%',
        backgroundColor: colors.bgCard,
        borderRadius: 16,
        padding: 20,
        marginBottom: 40,
        shadowColor: colors.cardShadow,
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        gap: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
    },
    signInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.iconPrimary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        width: '100%',
        gap: 12,
        shadowColor: colors.cardShadow,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    signInText: {
        color: colors.iconInvert,
        fontSize: 18,
        fontWeight: '700',
    },
    existingUserContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 16,
    },
    existingUserText: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 8,
    },
    switchAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 16,
        width: '100%',
        gap: 8,
        backgroundColor: isDark ? `${colors.danger}22` : '#FEE2E2',
    },
    switchAccountText: {
        color: colors.danger,
        fontSize: 16,
        fontWeight: '600',
    },
});
