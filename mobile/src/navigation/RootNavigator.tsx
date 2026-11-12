import { ActivityIndicator, Pressable, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { COLORS } from "../theme/colors";
import LoginSignupScreen from "../screens/LoginSignupScreen";
import HabitOverviewScreen from "../screens/HabitOverviewScreen";
import HabitFormScreen from "../screens/HabitFormScreen";
import ProfileScreen from "../screens/ProfileScreen";

export type RootStackParamList = {
  LoginSignup: undefined;
  HabitOverview: undefined;
  HabitForm: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Vises i titelbjælken på "Mine vaner" og åbner profilen
function ProfileButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Profil">
      <Ionicons name="person-circle-outline" size={26} color={COLORS.greenDark} />
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
            // options som funktion giver adgang til navigation, så knappen kan åbne profilen
            options={({ navigation }) => ({
              title: "Mine vaner",
              headerRight: () => <ProfileButton onPress={() => navigation.navigate("Profile")} />,
            })}
          />
          <Stack.Screen name="HabitForm" component={HabitFormScreen} options={{ title: "Ny vane" }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />
        </>
      ) : (
        <Stack.Screen name="LoginSignup" component={LoginSignupScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
