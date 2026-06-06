import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";
import {
  Camera,
  ClipboardText,
  Gear,
  UserCircle,
} from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventProvider } from "../context/EventContext";
import { useI18n } from "../context/I18nContext";
import { ScannerScreen } from "../screens/ScannerScreen";
import { EventAttendanceScreen } from "../screens/EventAttendanceScreen";
import { MyScansScreen } from "../screens/MyScansScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ActivityLogScreen } from "../screens/ActivityLogScreen";
import { colors, layout, typography } from "../theme/tokens";

const Tab = createBottomTabNavigator();
const SettingsStack = createNativeStackNavigator();

type Props = {
  onLogout: () => void;
};

const TAB_ICONS = {
  Scan: Camera,
  Attendance: ClipboardText,
  MyScans: UserCircle,
  Settings: Gear,
} as const;

function TabIcon({
  routeName,
  focused,
}: {
  routeName: keyof typeof TAB_ICONS;
  focused: boolean;
}) {
  const Icon = TAB_ICONS[routeName];
  return (
    <Icon
      size={24}
      color={focused ? colors.gold : colors.goldLight}
      weight={focused ? "duotone" : "regular"}
    />
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
          <ActivityLogScreen onBack={() => navigation.goBack()} />
        )}
      </SettingsStack.Screen>
    </SettingsStack.Navigator>
  );
}

function Tabs({ onLogout }: Props) {
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      key={locale}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.goldLight,
        tabBarStyle: [
          styles.tabBar,
          { height: layout.tabBarHeight, paddingBottom: Math.max(insets.bottom, 8) },
        ],
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon
            routeName={route.name as keyof typeof TAB_ICONS}
            focused={focused}
          />
        ),
      })}
    >
      <Tab.Screen name="Scan" options={{ tabBarLabel: t("tabs.scan") }}>
        {() => <ScannerScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Attendance" options={{ tabBarLabel: t("tabs.attendance") }}>
        {() => <EventAttendanceScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="MyScans" options={{ tabBarLabel: t("tabs.myScans") }}>
        {() => <MyScansScreen onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Settings" options={{ tabBarLabel: t("tabs.settings") }}>
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
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tabLabel: { ...typography.micro, fontWeight: "600" },
});
