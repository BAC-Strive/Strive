import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/colors";

type Props = {
  points: number; // brugerens samlede point
};

export default function PointsBadge({ points }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>⭐ {points} point</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: COLORS.greenDark,
    fontWeight: "600",
  },
});
