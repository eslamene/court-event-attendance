import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { EventProvider } from "../context/EventContext";
import { useI18n } from "../context/I18nContext";
import { ScannerScreen } from "../screens/ScannerScreen";
import { EventAttendanceScreen } from "../screens/EventAttendanceScreen";
import { MyScansScreen } from "../screens/MyScansScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ActivityLogScreen } from "../screens/ActivityLogScreen";

const Tab = createBottomTabNavigator();
const SettingsStack = createNativeStackNavigator();

type Props = {
  onLogout: () => void;
};

const TAB_ICONS: Record<string, string> = {
  Scan: "📷",
  Attendance: "📋",
  MyScans: "👤",
  Settings: "⚙️",
};

function TabIcon({ routeName, focused }: { routeName: string; focused: boolean }) {
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
      {TAB_ICONS[routeName] ?? "•"}
    </Text>
  );
}

function SettingsStackScreen({ onLogout }: Props) {
  const { t, textAlign } = useI18n();

  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain">
        {({ navigation }) => (
          <SettingsScreen
            onLogout={onLogout}
            onOpenActivityLog={() => navigation.navigate("ActivityLog")}
          />
        )}
      </SettingsStack.Screen>
      <SettingsStack.Screen name="ActivityLog">
        {({ navigation }) => (
          <>
            <TouchableOpacity
              style={styles.backBar}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backText, { textAlign }]}>
                {t("activityLog.back")}
              </Text>
            </TouchableOpacity>
            <ActivityLogScreen />
          </>
        )}
      </SettingsStack.Screen>
    </SettingsStack.Navigator>
  );
}

function Tabs({ onLogout }: Props) {
  const { t, locale } = useI18n();

  return (
    <Tab.Navigator
      key={locale}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#5c3d1e",
        tabBarInactiveTintColor: "#8b6914",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon routeName={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen
        name="Scan"
        options={{ tabBarLabel: t("tabs.scan") }}
      >
        {() => <ScannerScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen
        name="Attendance"
        options={{ tabBarLabel: t("tabs.attendance") }}
      >
        {() => <EventAttendanceScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen
        name="MyScans"
        options={{ tabBarLabel: t("tabs.myScans") }}
      >
        {() => <MyScansScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{ tabBarLabel: t("tabs.settings") }}
      >
        {() => <SettingsStackScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function MainTabs({ onLogout }: Props) {
  return (
    <EventProvider>
      <NavigationContainer>
        <Tabs onLogout={onLogout} />
      </NavigationContainer>
    </EventProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopColor: "#e8dcc8",
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabLabel: { fontSize: 11, fontWeight: "600" },
  tabIcon: { fontSize: 20, opacity: 0.6 },
  tabIconActive: { opacity: 1 },
  backBar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#5c3d1e",
  },
  backText: {
    color: "#d4a84b",
    fontSize: 14,
    fontWeight: "600",
  },
});
