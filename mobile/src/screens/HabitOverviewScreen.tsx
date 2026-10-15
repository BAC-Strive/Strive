import { Button, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "HabitOverview">;

export default function HabitOverviewScreen({ navigation }: Props) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
      <Text>Vaneoversigt</Text>
      <Button title="Ny vane" onPress={() => navigation.navigate("HabitForm")} />
    </View>
  );
}