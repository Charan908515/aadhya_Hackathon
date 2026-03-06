import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../locales';
import { Language } from '../locales/types';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onClose,
}) => {
  const { language, setLanguage, t } = useLanguage();

  console.log('Languages available:', languages); // Debug log

  const handleLanguageSelect = (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
    onClose();
  };

  const renderLanguageItem = ({ item }: { item: typeof languages[0] }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        language === item.code && styles.selectedLanguageItem,
      ]}
      onPress={() => handleLanguageSelect(item.code)}
    >
      <View style={styles.languageInfo}>
        <Text style={styles.languageName}>{item.nativeName}</Text>
        <Text style={styles.languageEnglishName}>{item.name}</Text>
      </View>
      {language === item.code && (
        <Ionicons name="checkmark" size={20} color="#6366F1" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.home.selectLanguage}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          {/* Language List */}
          <View style={styles.languageList}>
            {languages.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[
                  styles.languageItem,
                  language === item.code && styles.selectedLanguageItem,
                ]}
                onPress={() => handleLanguageSelect(item.code)}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{item.nativeName}</Text>
                  <Text style={styles.languageEnglishName}>{item.name}</Text>
                </View>
                {language === item.code && (
                  <Ionicons name="checkmark" size={20} color="#6366F1" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    maxHeight: '70%',
    width: '90%',
    maxWidth: 400,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedLanguageItem: {
    backgroundColor: '#EEF2FF',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  languageEnglishName: {
    fontSize: 14,
    color: '#6B7280',
  },
});
