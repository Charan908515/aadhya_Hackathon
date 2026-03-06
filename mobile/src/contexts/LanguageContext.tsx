import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language, Translations } from '../locales/types';
import { translations } from '../locales';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
  };

  const loadLanguage = () => {
    setIsLoading(false);
  };

  React.useEffect(() => {
    loadLanguage();
  }, []);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language],
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
