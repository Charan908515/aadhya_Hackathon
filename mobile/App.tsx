import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import VerdictScreen from "./src/screens/VerdictScreen";
import ImageUploadScreen from "./src/screens/ImageUploadScreen";
import GmailSignInScreen from "./src/screens/GmailSignInScreen";
import GmailScanScreen from "./src/screens/GmailScanScreen";
import TutorialScreen from "./src/screens/TutorialScreen";
import { SmsProvider } from "./src/data/SmsContext";
import { LanguageProvider } from "./src/contexts/LanguageContext";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type RootStackParamList = {
  Tutorial: undefined;
  Home: undefined;
  Verdict: { messageId?: string, message?: any, analysisResult?: any } | undefined;
  ImageUpload: undefined;
  GmailSignIn: undefined;
  GmailScan: { accessToken: string; userFullName?: string; userEmail?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainApp() {
  const { colors, isDark } = useTheme();
  const [initialRoute, setInitialRoute] = React.useState<keyof RootStackParamList | null>(null);

  React.useEffect(() => {
    async function checkTutorial() {
      try {
        const completed = await AsyncStorage.getItem("@tutorial_completed");
        if (completed === "true") {
          setInitialRoute("Home");
        } else {
          setInitialRoute("Tutorial");
        }
      } catch (e) {
        setInitialRoute("Tutorial");
      }
    }
    checkTutorial();
  }, []);

  if (initialRoute === null) {
    // Optionally return a splash/loading screen here
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Tutorial" component={TutorialScreen} />
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
