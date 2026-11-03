import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { COLORS } from "../theme/colors";
import LoginSignupScreen from "../screens/LoginSignupScreen";
import HabitOverviewScreen from "../screens/HabitOverviewScreen";
import HabitFormScreen from "../screens/HabitFormScreen";

export type RootStackParamList = {
  LoginSignup: undefined;
  HabitOverview: undefined;
  HabitForm: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Vises i titelbjælken på "Mine vaner". Navigationen skifter selv til login, når user bliver null.
function LogoutButton() {
  const { logout } = useAuth();

  return (
    <Pressable onPress={logout} hitSlop={8} accessibilityRole="button">
      <Text style={{ color: COLORS.greenDark, fontSize: 16, fontWeight: "600" }}>Log ud</Text>
    </Pressable>
  );
}

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  // Mens appen tjekker en gemt token ved opstart, vises en loading-indikator.
  // Når tjekket er færdigt, vises login eller habit-overview afhængigt af om der er en bruger.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Hvilke skærme der findes afhænger af, om brugeren er logget ind.
  // Når user ændrer sig, skifter navigationen automatisk.
  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen
            name="HabitOverview"
            component={HabitOverviewScreen}
            options={{ title: "Mine vaner", headerRight: () => <LogoutButton /> }}
          />
          <Stack.Screen name="HabitForm" component={HabitFormScreen} options={{ title: "Ny vane" }} />
        </>
      ) : (
        <Stack.Screen name="LoginSignup" component={LoginSignupScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
