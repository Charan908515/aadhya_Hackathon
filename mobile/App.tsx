import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import VerdictScreen from "./src/screens/VerdictScreen";
import { SmsProvider } from "./src/data/SmsContext";

export type RootStackParamList = {
  Home: undefined;
  Verdict: { messageId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SmsProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#F8FAFC" },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Verdict" component={VerdictScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SmsProvider>
  );
}
