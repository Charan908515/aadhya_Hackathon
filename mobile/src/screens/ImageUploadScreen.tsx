import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useLanguage } from '../contexts/LanguageContext';
import { getSystemPrompt } from '../locales';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AnalysisResult {
  text: string;
  isFraud: boolean;
  confidence: number;
  riskLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK';
  fraudType?: string;
  explanation: string;
}

const SAMBANOVA_API_KEY = '46ee0645-ede2-40c0-9168-0cd3dfbfdb68'; // Replace with actual API key

export default function ImageUploadScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setResult(null);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(selectedImage, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Use SambaNova vision model to analyze the image directly
      const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SAMBANOVA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'Llama-4-Maverick-17B-128E-Instruct',
          messages: [
            {
              role: 'system',
              content: getSystemPrompt(language)
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this message screenshot for fraud indicators. Extract the text and classify it.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Clean up potential markdown formatting
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/g, '');
      }

      try {
        const parsedResult = JSON.parse(cleanContent);

        // Validate the result has required fields
        if (!parsedResult.text || typeof parsedResult.isFraud !== 'boolean') {
          throw new Error('Invalid response format');
        }

        setResult(parsedResult);
      } catch (parseError) {
        console.error('Parse error:', parseError, '\nContent:', cleanContent);
        // Fallback result if JSON parsing fails
        Alert.alert(
          'Analysis Complete',
          'The image was analyzed, but the response format was unexpected. Please try again.'
        );
      }

    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        error instanceof Error ? error.message : 'Failed to analyze the image. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'SAFE':
        return colors.safe;
      case 'SUSPICIOUS':
        return colors.warning;
      case 'HIGH RISK':
        return colors.danger;
      default:
        return colors.textDim;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={isDark ? [colors.bgMid, colors.bgDeep] : ['#6366F1', '#8B5CF6']}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={20} color={isDark ? colors.iconPrimary : "white"} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t.imageUpload.title}</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Upload Section */}
          <View style={styles.uploadSection}>
            <View style={styles.uploadHeader}>
              <View style={styles.uploadIcon}>
                <Ionicons name="camera-outline" size={24} color={colors.accentIndigo} />
              </View>
              <View style={styles.uploadHeaderText}>
                <Text style={styles.uploadTitle}>{t.imageUpload.title}</Text>
                <Text style={styles.uploadSubtitle}>{t.imageUpload.subtitle}</Text>
              </View>
            </View>

            {!selectedImage ? (
              <TouchableOpacity
                onPress={pickImage}
                style={styles.uploadPlaceholder}
              >
                <Ionicons name="image-outline" size={56} color={colors.accentIndigo} />
                <Text style={styles.uploadPlaceholderText}>
                  {t.imageUpload.uploadPlaceholder}
                </Text>
                <Text style={styles.uploadPlaceholderSubtext}>
                  {t.imageUpload.supports}
                </Text>
                <View style={styles.aiBadge}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.accentIndigo} />
                  <Text style={styles.aiBadgeText}>{t.imageUpload.aiBadge}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.selectedImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageOverlayText}>{t.imageUpload.analyzing}</Text>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={pickImage}
                    style={styles.changeButton}
                  >
                    <Ionicons name="refresh-outline" size={20} color={colors.textDim} />
                    <Text style={styles.changeButtonText}>{t.imageUpload.changeImage}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={analyzeImage}
                    disabled={isAnalyzing}
                    style={styles.analyzeButton}
                  >
                    {isAnalyzing ? (
                      <ActivityIndicator color={colors.iconInvert} />
                    ) : (
                      <>
                        <Ionicons name="search-outline" size={20} color={colors.iconInvert} />
                        <Text style={styles.analyzeButtonText}>{t.imageUpload.analyze}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Info Cards */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons name="shield-checkmark" size={16} color={colors.accentBlue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{t.imageUpload.fraudDetection}</Text>
                <Text style={styles.infoSubtitle}>{t.imageUpload.fraudDetectionDesc}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIconGreen}>
                <Ionicons name="checkmark-circle" size={16} color={colors.safe} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitleGreen}>{t.imageUpload.multiPlatform}</Text>
                <Text style={styles.infoSubtitleGreen}>{t.imageUpload.multiPlatformDesc}</Text>
              </View>
            </View>
          </View>

          {/* Results Section */}
          {result && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>{t.imageUpload.results}</Text>
                <View
                  style={[styles.riskBadge, { backgroundColor: getRiskColor(result.riskLevel) + '20' }]}
                >
                  <Text
                    style={[styles.riskBadgeText, { color: getRiskColor(result.riskLevel) }]}
                  >
                    {result.riskLevel}
                  </Text>
                </View>
              </View>

              {/* Extracted Text */}
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>{t.imageUpload.extractedText}</Text>
                <View style={styles.textContainer}>
                  <Text style={styles.extractedText}>{result.text}</Text>
                </View>
              </View>

              {/* Classification Details */}
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>{t.imageUpload.classification}</Text>
                <View style={styles.classificationContainer}>
                  <Text style={styles.classificationText}>
                    {result.isFraud ? t.verdict.fraudulent : t.verdict.legitimate}
                  </Text>
                  <Text style={styles.confidenceText}>
                    {result.confidence}% {t.imageUpload.confidence}
                  </Text>
                </View>
              </View>

              {result.fraudType && (
                <View style={styles.resultSection}>
                  <Text style={styles.resultSectionTitle}>{t.imageUpload.fraudType}</Text>
                  <View style={styles.fraudTypeContainer}>
                    <Text style={styles.fraudTypeText}>{result.fraudType}</Text>
                  </View>
                </View>
              )}

              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>{t.imageUpload.explanation}</Text>
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationText}>{result.explanation}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Verdict', {
                    messageId: 'image-analysis',
                    analysisResult: result
                  })}
                  style={styles.viewDetailsButton}
                >
                  <Text style={styles.viewDetailsText}>{t.imageUpload.viewDetails}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(null);
                    setResult(null);
                  }}
                  style={styles.newAnalysisButton}
                >
                  <Text style={styles.newAnalysisText}>{t.imageUpload.newAnalysis}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50, // Add top padding to avoid notification bar overlap
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: isDark ? colors.textPrimary : 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  uploadSection: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.bgMid,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadHeaderText: {
    flex: 1,
  },
  uploadTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  uploadSubtitle: {
    color: colors.textDim,
    fontSize: 14,
  },
  uploadPlaceholder: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.bgMid,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  uploadPlaceholderText: {
    color: colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 16,
  },
  uploadPlaceholderSubtext: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: colors.bgDeep,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  aiBadgeText: {
    color: colors.accentIndigo,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  imageContainer: {
    marginBottom: 16,
  },
  selectedImage: {
    width: '100%',
    height: 256,
    borderRadius: 16,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  changeButton: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  changeButtonText: {
    color: colors.textMuted,
    fontWeight: '500',
    marginLeft: 8,
  },
  analyzeButton: {
    flex: 1,
    backgroundColor: colors.accentIndigo,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: colors.iconInvert,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoCards: {
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: colors.bgDeep,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    backgroundColor: colors.bgMid,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoIconGreen: {
    width: 32,
    height: 32,
    backgroundColor: isDark ? `${colors.safe}33` : '#D1FAE5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontWeight: '500',
    fontSize: 14,
  },
  infoSubtitle: {
    color: colors.accentBlue,
    fontSize: 12,
    marginTop: 4,
  },
  infoTitleGreen: {
    color: colors.textPrimary,
    fontWeight: '500',
    fontSize: 14,
  },
  infoSubtitleGreen: {
    color: colors.safe,
    fontSize: 12,
    marginTop: 4,
  },
  resultsSection: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resultsTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  riskBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultSection: {
    marginBottom: 16,
  },
  resultSectionTitle: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textContainer: {
    backgroundColor: colors.bgMid,
    padding: 12,
    borderRadius: 8,
  },
  extractedText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  classificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgMid,
    padding: 12,
    borderRadius: 8,
  },
  classificationText: {
    color: colors.textPrimary,
    fontWeight: '500',
    fontSize: 14,
  },
  confidenceText: {
    color: colors.textDim,
    fontSize: 14,
  },
  fraudTypeContainer: {
    backgroundColor: isDark ? `${colors.danger}33` : '#FEF2F2',
    padding: 12,
    borderRadius: 8,
  },
  fraudTypeText: {
    color: colors.danger,
    fontWeight: '500',
    fontSize: 14,
  },
  explanationContainer: {
    backgroundColor: colors.bgDeep,
    padding: 12,
    borderRadius: 8,
  },
  explanationText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: colors.accentIndigo,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: colors.iconInvert,
    fontWeight: '500',
  },
  newAnalysisButton: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  newAnalysisText: {
    color: colors.textMuted,
    fontWeight: '500',
  },
});