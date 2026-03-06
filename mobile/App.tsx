import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import VerdictScreen from "./src/screens/VerdictScreen";
import ImageUploadScreen from "./src/screens/ImageUploadScreen";
import GmailSignInScreen from "./src/screens/GmailSignInScreen";
import GmailScanScreen from "./src/screens/GmailScanScreen";
import { SmsProvider } from "./src/data/SmsContext";
import { LanguageProvider } from "./src/contexts/LanguageContext";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";

export type RootStackParamList = {
  Home: undefined;
  Verdict: { messageId?: string, message?: any, analysisResult?: any } | undefined;
  ImageUpload: undefined;
  GmailSignIn: undefined;
  GmailScan: { accessToken: string; userFullName?: string; userEmail?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainApp() {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Verdict" component={VerdictScreen} />
        <Stack.Screen name="ImageUpload" component={ImageUploadScreen} />
        <Stack.Screen name="GmailSignIn" component={GmailSignInScreen} />
        <Stack.Screen name="GmailScan" component={GmailScanScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SmsProvider>
          <MainApp />
        </SmsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
