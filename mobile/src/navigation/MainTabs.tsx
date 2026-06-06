import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, StyleSheet } from "react-native";
import { EventProvider } from "../context/EventContext";
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

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    مسح: "📷",
    "سجل الحضور": "📋",
    مسوحاتي: "👤",
    الإعدادات: "⚙️",
  };
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
      {icons[label] ?? "•"}
    </Text>
  );
}

function SettingsStackScreen({ onLogout }: Props) {
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
            <Text
              style={styles.backBar}
              onPress={() => navigation.goBack()}
            >
              ‹ رجوع إلى الإعدادات
            </Text>
            <ActivityLogScreen />
          </>
        )}
      </SettingsStack.Screen>
    </SettingsStack.Navigator>
  );
}

export function MainTabs({ onLogout }: Props) {
  return (
    <EventProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: "#5c3d1e",
            tabBarInactiveTintColor: "#8b6914",
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabLabel,
            tabBarIcon: ({ focused }) => (
              <TabIcon label={route.name} focused={focused} />
            ),
          })}
        >
          <Tab.Screen name="مسح">
            {() => <ScannerScreen onLogout={onLogout} />}
          </Tab.Screen>
          <Tab.Screen name="سجل الحضور">
            {() => <EventAttendanceScreen onLogout={onLogout} />}
          </Tab.Screen>
          <Tab.Screen name="مسوحاتي">
            {() => <MyScansScreen onLogout={onLogout} />}
          </Tab.Screen>
          <Tab.Screen name="الإعدادات">
            {() => <SettingsStackScreen onLogout={onLogout} />}
          </Tab.Screen>
        </Tab.Navigator>
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
    color: "#d4a84b",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
});
