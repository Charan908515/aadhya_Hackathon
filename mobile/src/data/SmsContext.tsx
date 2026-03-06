import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  demoMessages,
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
  const [messages, setMessages] = useState<SmsMessage[]>(demoMessages);
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
        return [newMessage, ...prev];
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
      setNote("SMS access is unavailable in Expo Go. Showing demo messages.");
    }
  };

  const refreshInbox = async () => {
    setLoadingSms(true);
    try {
      const inbox = await readInboxSms();
      if (inbox.length === 0) {
        setMessages(demoMessages);
        setNote("No SMS found. Showing demo messages.");
      } else {
        setMessages(inbox);
        setNote(`Loaded ${inbox.length} messages from inbox.`);
      }
    } catch {
      setMessages(demoMessages);
      setNote("Inbox reading unavailable. Showing demo messages.");
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
