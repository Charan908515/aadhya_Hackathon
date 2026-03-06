import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { GmailService } from '../services/GmailService';

type Props = NativeStackScreenProps<RootStackParamList, "GmailSignIn">;

export default function GmailSignInScreen({ navigation }: Props) {
    useEffect(() => {
        GmailService.configure();
    }, []);

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
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Connect Gmail</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="mail" size={64} color="#EF4444" />
                </View>
                <Text style={styles.title}>Scan Your Inbox</Text>
                <Text style={styles.subtitle}>
                    Securely connect your Gmail to detect phishing, scams, and deceptive emails using our local AI model.
                </Text>

                <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                        <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                        <Text style={styles.featureText}>Scanning is done purely locally.</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="lock-closed" size={24} color="#10B981" />
                        <Text style={styles.featureText}>We only require read-only access.</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="eye-off" size={24} color="#10B981" />
                        <Text style={styles.featureText}>Your emails are never stored.</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.signInButton} onPress={handleSignIn} activeOpacity={0.8}>
                    <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                    <Text style={styles.signInText}>Sign in with Google</Text>
                </TouchableOpacity>

            </View>
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
        backgroundColor: '#FEE2E2',
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#475569',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    featureList: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 40,
        shadowColor: '#000',
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
        color: '#334155',
        fontWeight: '500',
        flex: 1,
    },
    signInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        width: '100%',
        gap: 12,
        shadowColor: '#0F172A',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    signInText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
