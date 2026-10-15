import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginSignupScreen from "../screens/LoginSignupScreen";
import HabitOverviewScreen from "../screens/HabitOverviewScreen";
import HabitFormScreen from "../screens/HabitFormScreen";

export type RootStackParamList = {
  LoginSignup: undefined;
  HabitOverview: undefined;
  HabitForm: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="LoginSignup">
      <Stack.Screen name="LoginSignup" component={LoginSignupScreen} options={{ title: "Log ind" }} />
      <Stack.Screen name="HabitOverview" component={HabitOverviewScreen} options={{ title: "Mine vaner" }} />
      <Stack.Screen name="HabitForm" component={HabitFormScreen} options={{ title: "Ny vane" }} />
    </Stack.Navigator>
  );
}