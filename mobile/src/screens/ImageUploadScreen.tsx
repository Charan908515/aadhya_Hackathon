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
        return '#10B981';
      case 'SUSPICIOUS':
        return '#F59E0B';
      case 'HIGH RISK':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
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
                <Ionicons name="camera-outline" size={24} color="#6366F1" />
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
                <Ionicons name="image-outline" size={56} color="#6366F1" />
                <Text style={styles.uploadPlaceholderText}>
                  {t.imageUpload.uploadPlaceholder}
                </Text>
                <Text style={styles.uploadPlaceholderSubtext}>
                  {t.imageUpload.supports}
                </Text>
                <View style={styles.aiBadge}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#6366F1" />
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
                    <Ionicons name="refresh-outline" size={20} color="#6B7280" />
                    <Text style={styles.changeButtonText}>{t.imageUpload.changeImage}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={analyzeImage}
                    disabled={isAnalyzing}
                    style={styles.analyzeButton}
                  >
                    {isAnalyzing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="search-outline" size={20} color="white" />
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
                <Ionicons name="shield-checkmark" size={16} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{t.imageUpload.fraudDetection}</Text>
                <Text style={styles.infoSubtitle}>{t.imageUpload.fraudDetectionDesc}</Text>
              </View>
            </View>
            
            <View style={styles.infoCard}>
              <View style={styles.infoIconGreen}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
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
                  onPress={() => navigation.navigate('Verdict', { messageId: 'image-analysis' })}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
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
    backgroundColor: '#EEF2FF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadHeaderText: {
    flex: 1,
  },
  uploadTitle: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '600',
  },
  uploadSubtitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  uploadPlaceholder: {
    borderWidth: 2,
    borderColor: '#A5B4FC',
    borderStyle: 'dashed',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  uploadPlaceholderText: {
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 16,
  },
  uploadPlaceholderSubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  aiBadgeText: {
    color: '#4F46E5',
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
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  changeButtonText: {
    color: '#374151',
    fontWeight: '500',
    marginLeft: 8,
  },
  analyzeButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  infoCards: {
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoIconGreen: {
    width: 32,
    height: 32,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#1E3A8A',
    fontWeight: '500',
    fontSize: 14,
  },
  infoSubtitle: {
    color: '#3B82F6',
    fontSize: 12,
    marginTop: 4,
  },
  infoTitleGreen: {
    color: '#064E3B',
    fontWeight: '500',
    fontSize: 14,
  },
  infoSubtitleGreen: {
    color: '#10B981',
    fontSize: 12,
    marginTop: 4,
  },
  resultsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
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
    color: '#1F2937',
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
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  extractedText: {
    color: '#1F2937',
    fontSize: 14,
  },
  classificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  classificationText: {
    color: '#1F2937',
    fontWeight: '500',
    fontSize: 14,
  },
  confidenceText: {
    color: '#6B7280',
    fontSize: 14,
  },
  fraudTypeContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
  },
  fraudTypeText: {
    color: '#991B1B',
    fontWeight: '500',
    fontSize: 14,
  },
  explanationContainer: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
  },
  explanationText: {
    color: '#1E3A8A',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: 'white',
    fontWeight: '500',
  },
  newAnalysisButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  newAnalysisText: {
    color: '#374151',
    fontWeight: '500',
  },
});