import { StyleSheet } from "react-native";
import { NornColors } from "@/theme";

export const homeScreenStyles = StyleSheet.create({
  bannerLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerLayerMascot: {
    backgroundColor: NornColors.mascotBackground,
  },
});
