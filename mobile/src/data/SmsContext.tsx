import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PermissionState,
  readInboxSms,
  requestSmsPermissions,
  SmsMessage,
  smsEventEmitter,
  localAnalyzeMessage,
} from "./sms";

type SmsContextValue = {
  permissionState: PermissionState;
  loadingSms: boolean;
  note: string;
  messages: SmsMessage[];
  refreshInbox: () => Promise<void>;
  requestAccess: () => Promise<void>;
  getMessageById: (id?: string) => SmsMessage | null;
};

const SmsContext = createContext<SmsContextValue | null>(null);

export function SmsProvider({ children }: { children: React.ReactNode }) {
  const [permissionState, setPermissionState] = useState<PermissionState>("idle");
  const [loadingSms, setLoadingSms] = useState(false);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [note, setNote] = useState("Tap scan to check your SMS inbox for scams.");

  // Load previous permission state on mount
  useEffect(() => {
    const loadPermission = async () => {
      try {
        const stored = await AsyncStorage.getItem("@permission_state");
        if (stored === "granted" || stored === "denied" || stored === "unavailable") {
          setPermissionState(stored as PermissionState);
          if (stored === "granted") {
            refreshInbox();
          } else if (stored === "denied") {
            setNote("Permission denied. Allow SMS access to scan real messages.");
          } else {
            setNote("SMS inbox reading works only on Android devices.");
          }
        }
      } catch (err) {
        // Ignore read errors
      }
    };
    loadPermission();
  }, []);

  useEffect(() => {
    if (!smsEventEmitter) {
      return;
    }

    const subscription = smsEventEmitter.addListener("smsReceived", (payload) => {
      const body = typeof payload?.body === "string" ? payload.body : "";
      const address = typeof payload?.address === "string" ? payload.address : "Unknown Sender";
      const timestamp =
        typeof payload?.timestamp === "number" && Number.isFinite(payload.timestamp)
          ? payload.timestamp
          : Date.now();

      if (!body.trim()) {
        return;
      }

      const verdict = localAnalyzeMessage(body);
      const newMessage: SmsMessage = {
        id: `${timestamp}-${address}`.replace(/\s+/g, "_"),
        address,
        body: body.trim(),
        date: timestamp,
        verdict,
      };

      setMessages((prev) => {
        if (prev.some((item) => item.id === newMessage.id)) {
          return prev;
        }
        return [newMessage, ...prev].slice(0, 30);
      });
    });

    return () => subscription.remove();
  }, []);

  const requestAccess = async () => {
    try {
      setPermissionState("requesting");
      const result = await requestSmsPermissions();

      await AsyncStorage.setItem("@permission_state", result);

      if (result === "denied") {
        setPermissionState("denied");
        setNote("Permission denied. Allow SMS access to scan real messages.");
        return;
      }
      if (result === "unavailable") {
        setPermissionState("unavailable");
        setNote("SMS inbox reading works only on Android devices.");
        return;
      }

      setPermissionState("granted");
      setNote("Permission granted. Loading SMS inbox...");
      await refreshInbox();
    } catch {
      setPermissionState("unavailable");
      setNote("SMS access is unavailable in Expo Go.");
    }
  };

  const refreshInbox = async () => {
    setLoadingSms(true);
    try {
      const inbox = await readInboxSms();
      console.log("Refresh inbox got:", inbox.length, "messages");

      if (inbox.length === 0) {
        setMessages([]);
        setNote("No SMS found.");
      } else {
        // Check if these look like real messages (not demo)
        const realMessages = inbox.filter(msg =>
          msg.address !== "Demo Sender" &&
          msg.body !== "(empty message)" &&
          !msg.body.includes("demo") &&
          msg.date > (Date.now() - 30 * 24 * 60 * 60 * 1000) // Messages from last 30 days
        );

        console.log("Real messages count:", realMessages.length);

        if (realMessages.length === 0) {
          setMessages([]);
          setNote("No recent SMS found.");
        } else {
          // Only add new messages, don't replace existing ones
          setMessages((prevMessages) => {
            const existingIds = new Set(prevMessages.map(msg => msg.id));
            const newMessages = realMessages.filter(msg => !existingIds.has(msg.id));

            if (newMessages.length > 0) {
              // Combine new messages with existing ones, keep only latest 30
              const allMessages = [...newMessages, ...prevMessages];
              const sortedMessages = allMessages.sort((a, b) => b.date - a.date);
              const latest30Messages = sortedMessages.slice(0, 30);
              setNote(`Loaded ${realMessages.length} real messages. ${newMessages.length} new messages detected. Showing latest 30.`);
              return latest30Messages;
            } else {
              // Show latest 30 existing messages if no new ones
              const sortedExisting = prevMessages.sort((a, b) => b.date - a.date);
              const latest30Existing = sortedExisting.slice(0, 30);
              setNote(`Loaded ${realMessages.length} real messages. No new messages. Showing latest 30.`);
              return latest30Existing;
            }
          });
        }
      }
    } catch (error) {
      console.error("SMS refresh failed:", error);
      setMessages([]);
      setNote("Inbox reading unavailable.");
    } finally {
      setLoadingSms(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (permissionState === "granted") {
      // Auto-refresh every 10 seconds (10000ms)
      interval = setInterval(() => {
        refreshInbox();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [permissionState]);

  const getMessageById = (id?: string) => {
    if (!id) {
      return null;
    }
    return messages.find((item) => item.id === id) ?? null;
  };

  const value = useMemo(
    () => ({
      permissionState,
      loadingSms,
      note,
      messages,
      refreshInbox,
      requestAccess,
      getMessageById,
    }),
    [permissionState, loadingSms, note, messages]
  );

  return <SmsContext.Provider value={value}>{children}</SmsContext.Provider>;
}

export function useSms() {
  const ctx = useContext(SmsContext);
  if (!ctx) {
    throw new Error("useSms must be used within SmsProvider");
  }
  return ctx;
}
