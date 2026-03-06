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
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../theme';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onClose,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

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
        <Ionicons name="checkmark" size={20} color={colors.accentIndigo} />
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
              <Ionicons name="close" size={24} color={colors.textDim} />
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
                  <Ionicons name="checkmark" size={20} color={colors.accentIndigo} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
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
    borderBottomColor: colors.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
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
    borderBottomColor: colors.border,
  },
  selectedLanguageItem: {
    backgroundColor: colors.bgMid,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  languageEnglishName: {
    fontSize: 14,
    color: colors.textDim,
  },
});
