import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors, ThemeColors } from "../theme";

type ThemeType = "light" | "dark";

interface ThemeContextType {
    theme: ThemeType;
    colors: ThemeColors;
    toggleTheme: () => void;
    setTheme: (theme: ThemeType) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "light",
    colors: lightColors,
    toggleTheme: () => { },
    setTheme: () => { },
    isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>(systemColorScheme === "dark" ? "dark" : "light");

    const toggleTheme = () => {
        setThemeState((prev) => (prev === "light" ? "dark" : "light"));
    };

    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
    };

    // Optional: Listen to system theme changes if not manually overridden
    // useEffect(() => {
    //   if (systemColorScheme) {
    //     setThemeState(systemColorScheme === "dark" ? "dark" : "light");
    //   }
    // }, [systemColorScheme]);

    const colors = theme === "dark" ? darkColors : lightColors;
    const isDark = theme === "dark";

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
