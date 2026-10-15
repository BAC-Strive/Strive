import { Button, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "LoginSignup">;

export default function LoginSignupScreen({ navigation }: Props) {
	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				alignItems: "center",
				gap: 12,
			}}
		>
			<Text>Log ind / opret bruger</Text>
			<Button
				title="Gå til oversigt (midlertidig)"
				onPress={() => navigation.navigate("HabitOverview")}
			/>
		</View>
	);
}
