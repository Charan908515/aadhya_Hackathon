import React, { useState } from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { ThemeColors } from "../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = NativeStackScreenProps<RootStackParamList, "Tutorial">;

const { width } = Dimensions.get("window");

export default function TutorialScreen({ navigation }: Props) {
    const { t, setLanguage, language } = useLanguage();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const [step, setStep] = useState(0);

    const completeTutorial = async () => {
        await AsyncStorage.setItem("@tutorial_completed", "true");
        navigation.replace("Home");
    };

    const nextStep = () => {
        if (step === 1) {
            completeTutorial();
        } else {
            setStep(step + 1);
        }
    };

    const languages = [
        { code: "en", name: "English", native: "English" },
        { code: "hi", name: "Hindi", native: "हिंदी" },
        { code: "te", name: "Telugu", native: "తెలుగు" },
        { code: "ta", name: "Tamil", native: "தமிழ்" },
    ] as const;

    const renderLanguageSelection = () => (
        <View style={styles.slide}>
            <View style={styles.iconCircle}>
                <Ionicons name="globe-outline" size={48} color={colors.accentIndigo} />
            </View>
            <Text style={styles.title}>{t.tutorial.welcome}</Text>
            <Text style={styles.subtitle}>{t.tutorial.description}</Text>

            <View style={styles.languageList}>
                <Text style={styles.sectionHeader}>{t.tutorial.selectLanguageText}</Text>
                {languages.map((l) => (
                    <TouchableOpacity
                        key={l.code}
                        style={[
                            styles.langOption,
                            language === l.code && styles.langOptionSelected,
                        ]}
                        onPress={() => setLanguage(l.code)}
                    >
                        <View style={styles.langRow}>
                            <Text
                                style={[
                                    styles.langOptionText,
                                    language === l.code && styles.langOptionTextSelected,
                                ]}
                            >
                                {l.native}
                            </Text>
                            {language === l.code && (
                                <Ionicons name="checkmark-circle" size={24} color={colors.accentIndigo} />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={nextStep}>
                <Text style={styles.buttonText}>{t.tutorial.next}</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );

    const renderFeatures = () => (
        <View style={styles.slide}>
            <Text style={styles.title}>{t.home.title}</Text>
            <Text style={styles.subtitle}>{t.home.subtitle}</Text>

            <ScrollView style={styles.featuresList} showsVerticalScrollIndicator={false}>
                <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: `${colors.iconPrimary}22` }]}>
                        <Ionicons name="shield-checkmark-outline" size={28} color={colors.iconPrimary} />
                    </View>
                    <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>{t.tutorial.features.smsScanning.title}</Text>
                        <Text style={styles.featureDesc}>{t.tutorial.features.smsScanning.desc}</Text>
                    </View>
                </View>

                <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: `${colors.accentIndigo}22` }]}>
                        <Ionicons name="camera-outline" size={28} color={colors.accentIndigo} />
                    </View>
                    <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>{t.tutorial.features.imageAnalysis.title}</Text>
                        <Text style={styles.featureDesc}>{t.tutorial.features.imageAnalysis.desc}</Text>
                    </View>
                </View>

                <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: `${colors.accentTeal}22` }]}>
                        <Ionicons name="mail-outline" size={28} color={colors.accentTeal} />
                    </View>
                    <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>{t.tutorial.features.gmailScan.title}</Text>
                        <Text style={styles.featureDesc}>{t.tutorial.features.gmailScan.desc}</Text>
                    </View>
                </View>
            </ScrollView>

            <TouchableOpacity style={styles.button} onPress={completeTutorial}>
                <Text style={styles.buttonText}>{t.tutorial.getStarted}</Text>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.progressRow}>
                <View style={[styles.dot, step === 0 && styles.dotActive]} />
                <View style={[styles.dot, step === 1 && styles.dotActive]} />
            </View>
            {step === 0 ? renderLanguageSelection() : renderFeatures()}
        </SafeAreaView>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 50,
    },
    progressRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        paddingVertical: 16,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    dotActive: {
        width: 24,
        backgroundColor: colors.accentIndigo,
    },
    slide: {
        flex: 1,
        width: width,
        paddingHorizontal: 24,
        paddingBottom: 40,
        alignItems: "center",
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: `${colors.accentIndigo}15`,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: colors.textPrimary,
        textAlign: "center",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 40,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.textDim,
        textTransform: "uppercase",
        marginBottom: 16,
        alignSelf: "flex-start",
    },
    languageList: {
        width: "100%",
        flex: 1,
    },
    langOption: {
        width: "100%",
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.bgCard,
        marginBottom: 12,
    },
    langOptionSelected: {
        borderColor: colors.accentIndigo,
        backgroundColor: `${colors.accentIndigo}10`,
    },
    langRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    langOptionText: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.textPrimary,
    },
    langOptionTextSelected: {
        color: colors.accentIndigo,
    },
    button: {
        width: "100%",
        height: 56,
        borderRadius: 16,
        backgroundColor: colors.accentIndigo,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginTop: 20,
        shadowColor: colors.accentIndigo,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    featuresList: {
        width: "100%",
        flex: 1,
    },
    featureCard: {
        flexDirection: "row",
        backgroundColor: colors.bgCard,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    featureIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.textPrimary,
        marginBottom: 6,
    },
    featureDesc: {
        fontSize: 14,
        color: colors.textDim,
        lineHeight: 20,
    },
});
